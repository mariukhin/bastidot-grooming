import { ObjectId } from 'mongodb';
import type { Db, Document, Filter } from 'mongodb';

import { CLIENT_COLLECTION, type Client } from '../../shared/client.ts';
import { USER_COLLECTION, type User } from '../../shared/user.ts';
import { normalizePhone } from '../../shared/phone.ts';
import { PET_COLLECTION, type Pet } from '../pet/types.ts';
import { SERVICE_COLLECTION, type Service } from '../service/types.ts';
import { ORDER_COLLECTION } from '../order/types.ts';

export const SEGMENTS = ['regular', 'new', 'lapsed', 'no_visits'] as const;
export type Segment = (typeof SEGMENTS)[number];

export const PAGE_SIZE = 20;

const DAY_MS = 24 * 60 * 60 * 1000;
/** «Постійні» — від трьох завершених візитів. */
const REGULAR_MIN_VISITS = 3;
/** «Нові» — перший завершений візит не давніше за 30 днів. */
const NEW_WINDOW_DAYS = 30;
/** «Давно не були» — понад 8 тижнів або понад два їхні звичні інтервали. */
const LAPSED_DAYS = 56;
const LAPSED_INTERVALS = 2;

export interface AdminClientDTO {
  id: string;
  name: string;
  phone: string;
  pets: { id: string; name: string }[];
  /** Завершені (completed) візити. */
  visitsCount: number;
  /** Сума завершених візитів, грн. */
  spent: number;
  firstVisitAt: string | null;
  lastVisitAt: string | null;
  /** Середній інтервал між завершеними візитами, дні; null — візитів менше двох. */
  avgIntervalDays: number | null;
  /** Є хоч один запис у будь-якому статусі. */
  hasOrders: boolean;
  segments: Segment[];
}

export interface AdminClientsPage {
  items: AdminClientDTO[];
  page: number;
  pageSize: number;
  total: number;
  /** Лічильники для плиток: по всіх клієнтах, що відповідають пошуку. */
  counts: { all: number } & Record<Segment, number>;
}

export class ClientListError extends Error {
  readonly status = 400;
  readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.code = code;
  }
}

export const DAY = DAY_MS;

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Пошук: імʼя чи прізвище, телефон (у будь-якому записі — 067…, 380…, +380…)
 * і кличка улюбленця. Частковий збіг: людина набирає «Оле» й одразу бачить «Олену».
 */
async function searchFilter(db: Db, raw: string): Promise<Filter<Client>> {
  const q = raw.trim();
  if (q === '') return {};

  const rx = new RegExp(escapeRegex(q), 'i');
  const or: Filter<Client>[] = [{ name: rx }, { lastName: rx }];

  const normalized = normalizePhone(q);
  if (normalized) {
    or.push({ phone: normalized.phone }, { phoneRaw: normalized.phoneRaw });
  }
  // Частина номера («1122») — шукаємо входження в обох формах запису.
  const digits = q.replace(/\D/g, '');
  if (digits.length >= 3) {
    const partial = new RegExp(escapeRegex(digits));
    or.push({ phone: partial }, { phoneRaw: partial });
  }

  const owners = await db
    .collection<Pet>(PET_COLLECTION)
    .find({ name: rx }, { projection: { userId: 1 } })
    .toArray();
  const ownerIds = owners.map((p) => p.userId).filter(Boolean);
  if (ownerIds.length > 0) or.push({ _id: { $in: ownerIds } });

  return { $or: or };
}

/** Прайс одним запитом: послуг ~200, тож таблиця в памʼяті дешевша за $lookup на кожен візит. */
export interface PriceTable {
  /** Паралельні масиви: id послуги → базова й VIP-ціна за тим самим індексом. */
  ids: ObjectId[];
  defaults: number[];
  vips: (number | null)[];
  vipGroomers: ObjectId[];
}

export async function loadPriceTable(db: Db): Promise<PriceTable> {
  const [services, vips] = await Promise.all([
    db
      .collection<Service>(SERVICE_COLLECTION)
      .find({}, { projection: { defaultPrice: 1, vipPrice: 1 } })
      .toArray(),
    db
      .collection<User>(USER_COLLECTION)
      .find({ isVip: true }, { projection: { _id: 1 } })
      .toArray(),
  ]);

  return {
    ids: services.map((s) => s._id!),
    defaults: services.map((s) => s.defaultPrice ?? 0),
    vips: services.map((s) => (typeof s.vipPrice === 'number' ? s.vipPrice : null)),
    vipGroomers: vips.map((u) => u._id!),
  };
}

const isCompleted = { $eq: ['$status', 'completed'] };

/**
 * Ціна візиту: зафіксована при завершенні (`total`), а для старих записів —
 * поточний прайс послуг (VIP-ціна, якщо грумер VIP).
 */
export function priceExpr(table: PriceTable): Document {
  return {
    $ifNull: [
      '$total',
      {
        $let: {
          vars: { vip: { $in: ['$groomerId', { $literal: table.vipGroomers }] } },
          in: {
            $sum: {
              $map: {
                input: { $ifNull: ['$serviceIds', []] },
                as: 'sid',
                in: {
                  $let: {
                    vars: { i: { $indexOfArray: [{ $literal: table.ids }, '$$sid'] } },
                    in: {
                      $cond: [
                        // Послугу прибрали з прайсу — 0, як і в кабінеті клієнта.
                        { $lt: ['$$i', 0] },
                        0,
                        {
                          $let: {
                            vars: { v: { $arrayElemAt: [{ $literal: table.vips }, '$$i'] } },
                            in: {
                              $cond: [
                                { $and: ['$$vip', { $isNumber: '$$v' }] },
                                '$$v',
                                { $arrayElemAt: [{ $literal: table.defaults }, '$$i'] },
                              ],
                            },
                          },
                        },
                      ],
                    },
                  },
                },
              },
            },
          },
        },
      },
    ],
  };
}

export interface ClientStats {
  _id: ObjectId;
  ordersCount: number;
  visitsCount: number;
  spent: number;
  firstVisitAt: Date | null;
  lastVisitAt: Date | null;
}

/**
 * Агрегати всіх клієнтів одним проходом по `order` з групуванням за clientId.
 * Це в рази дешевше за $lookup на кожного клієнта: на реальних даних
 * ~0 мс на сервері проти ~190 мс.
 */
export function statsPipeline(table: PriceTable, match?: Document): Document[] {
  return [
    ...(match ? [{ $match: match }] : []),
    {
      $group: {
        _id: '$clientId',
        ordersCount: { $sum: 1 },
        visitsCount: { $sum: { $cond: [isCompleted, 1, 0] } },
        spent: { $sum: { $cond: [isCompleted, priceExpr(table), 0] } },
        firstVisitAt: { $min: { $cond: [isCompleted, '$scheduledAt', null] } },
        lastVisitAt: { $max: { $cond: [isCompleted, '$scheduledAt', null] } },
      },
    },
  ];
}

export const EMPTY_STATS: Omit<ClientStats, '_id'> = {
  ordersCount: 0,
  visitsCount: 0,
  spent: 0,
  firstVisitAt: null,
  lastVisitAt: null,
};

export function avgIntervalMs(stats: Omit<ClientStats, '_id'>): number | null {
  if (stats.visitsCount < 2 || !stats.firstVisitAt || !stats.lastVisitAt) return null;
  return (stats.lastVisitAt.getTime() - stats.firstVisitAt.getTime()) / (stats.visitsCount - 1);
}

export function segmentsOf(stats: Omit<ClientStats, '_id'>, now = Date.now()): Segment[] {
  const out: Segment[] = [];
  if (stats.visitsCount >= REGULAR_MIN_VISITS) out.push('regular');
  if (stats.firstVisitAt && stats.firstVisitAt.getTime() >= now - NEW_WINDOW_DAYS * DAY_MS) {
    out.push('new');
  }
  if (stats.lastVisitAt) {
    const since = now - stats.lastVisitAt.getTime();
    const avg = avgIntervalMs(stats);
    if (since > LAPSED_DAYS * DAY_MS || (avg !== null && since > avg * LAPSED_INTERVALS)) {
      out.push('lapsed');
    }
  }
  if (stats.ordersCount > 0 && stats.visitsCount === 0) out.push('no_visits');
  return out;
}

export function parseSegment(value: unknown): Segment | null {
  if (value === undefined || value === '' || value === 'all') return null;
  if (SEGMENTS.includes(value as Segment)) return value as Segment;
  throw new ClientListError(`segment має бути одним із: all, ${SEGMENTS.join(', ')}`, 'bad-segment');
}

export function parsePage(value: unknown): number {
  if (value === undefined || value === '') return 1;
  const page = Number(value);
  if (!Number.isInteger(page) || page < 1) {
    throw new ClientListError('page має бути цілим числом від 1', 'bad-page');
  }
  return page;
}

/**
 * Список клієнтів для адміна. Агрегати рахуються в pipeline на кожен запит, а не
 * кешуються в `client`: кеш довелося б оновлювати з кожного місця, що міняє
 * статус чи ціну візиту, а прохід по сотнях записів коштує мілісекунди.
 */
export async function listAdminClients(
  db: Db,
  params: { q: string; segment: Segment | null; page: number }
): Promise<AdminClientsPage> {
  const [match, table] = await Promise.all([searchFilter(db, params.q), loadPriceTable(db)]);

  // Паралельно: агрегати по всіх записах коштують на сервері мілісекунди, тож
  // не чекаємо на результат пошуку, щоб звузити їх до знайдених клієнтів.
  const [clients, stats] = await Promise.all([
    db
      .collection<Client>(CLIENT_COLLECTION)
      .find(match, { projection: { name: 1, lastName: 1, phone: 1 } })
      .toArray(),
    db.collection(ORDER_COLLECTION).aggregate<ClientStats>(statsPipeline(table)).toArray(),
  ]);
  const statsById = new Map(stats.map((s) => [s._id.toHexString(), s]));

  const now = Date.now();
  const rows = clients.map((client) => {
    const st = statsById.get(client._id!.toHexString()) ?? EMPTY_STATS;
    return { client, stats: st, segments: segmentsOf(st, now) };
  });

  const counts = { all: rows.length, regular: 0, new: 0, lapsed: 0, no_visits: 0 };
  for (const row of rows) for (const s of row.segments) counts[s]++;

  const filtered = params.segment
    ? rows.filter((r) => r.segments.includes(params.segment!))
    : rows;

  // Спершу ті, хто був нещодавно; без візитів — у кінці, за імʼям.
  filtered.sort((a, b) => {
    const la = a.stats.lastVisitAt?.getTime() ?? 0;
    const lb = b.stats.lastVisitAt?.getTime() ?? 0;
    if (la !== lb) return lb - la;
    return (a.client.name ?? '').localeCompare(b.client.name ?? '', 'uk');
  });

  const start = (params.page - 1) * PAGE_SIZE;
  const page = filtered.slice(start, start + PAGE_SIZE);

  const pets = page.length
    ? await db
        .collection<Pet>(PET_COLLECTION)
        .find(
          { userId: { $in: page.map((r) => r.client._id!) }, archivedAt: null },
          { projection: { name: 1, userId: 1 } }
        )
        .toArray()
    : [];

  const iso = (d: Date | null) => (d ? d.toISOString() : null);

  return {
    items: page.map(({ client, stats: st, segments }) => {
      const avg = avgIntervalMs(st);
      return {
        id: client._id!.toHexString(),
        name: [client.name, client.lastName].filter(Boolean).join(' '),
        phone: client.phone,
        pets: pets
          .filter((p) => p.userId?.equals(client._id!))
          .map((p) => ({ id: p._id!.toHexString(), name: p.name })),
        visitsCount: st.visitsCount,
        spent: st.spent,
        firstVisitAt: iso(st.firstVisitAt),
        lastVisitAt: iso(st.lastVisitAt),
        avgIntervalDays: avg === null ? null : Math.round(avg / DAY_MS),
        hasOrders: st.ordersCount > 0,
        segments,
      };
    }),
    page: params.page,
    pageSize: PAGE_SIZE,
    total: filtered.length,
    counts,
  };
}
