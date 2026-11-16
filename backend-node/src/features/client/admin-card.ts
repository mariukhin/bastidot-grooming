import { ObjectId } from 'mongodb';
import type { Db } from 'mongodb';

import { CLIENT_COLLECTION, type Client } from '../../shared/client.ts';
import { USER_COLLECTION, type User } from '../../shared/user.ts';
import { normalizePhone } from '../../shared/phone.ts';
import { PET_COLLECTION, type Pet } from '../pet/types.ts';
import { fetchActiveTraits } from '../pet/traits.ts';
import { listPets, toAccountPetDTO } from '../pet/account-pets.ts';
import { SERVICE_COLLECTION, type Service } from '../service/types.ts';
import { ORDER_COLLECTION, type Order } from '../order/types.ts';
import {
  DAY,
  EMPTY_STATS,
  avgIntervalMs,
  loadPriceTable,
  priceExpr,
  segmentsOf,
  statsPipeline,
  type ClientStats,
  type Segment,
} from './admin-clients.ts';

/** Скільки останніх візитів показувати в картці. */
const RECENT_VISITS = 10;
const NAME_MAX = 60;
const NOTE_MAX = 2000;

export type ClientField = 'name' | 'lastName' | 'phone' | 'email' | 'adminNote';

export class ClientCardError extends Error {
  readonly status: number;
  readonly code: string;
  readonly field?: ClientField;
  /** Для 409 «такий телефон уже є» — id наявного клієнта, щоб адмін відкрив його. */
  readonly existingId?: string;

  constructor(
    message: string,
    status: number,
    code: string,
    extra: { field?: ClientField; existingId?: string } = {}
  ) {
    super(message);
    this.status = status;
    this.code = code;
    this.field = extra.field;
    this.existingId = extra.existingId;
  }
}

export interface ClientInput {
  name: string;
  lastName: string;
  phone: string;
  phoneRaw: string;
  isForeign: boolean;
  email: string;
  adminNote: string;
}

/** Ті самі правила для POST (усе обовʼязкове, крім прізвища, пошти й нотатки) і PATCH. */
export function parseClientInput(body: unknown, { partial }: { partial: boolean }): Partial<ClientInput> {
  if (typeof body !== 'object' || body === null) {
    throw new ClientCardError('Некоректний запит', 400, 'bad-body');
  }
  const b = body as Record<string, unknown>;
  const out: Partial<ClientInput> = {};

  if (!partial || b.name !== undefined) {
    const name = typeof b.name === 'string' ? b.name.trim() : '';
    if (name === '' || name.length > NAME_MAX) {
      throw new ClientCardError(`Імʼя обовʼязкове, до ${NAME_MAX} символів`, 400, 'bad-name', {
        field: 'name',
      });
    }
    out.name = name;
  }

  if (b.lastName !== undefined) {
    const lastName = typeof b.lastName === 'string' ? b.lastName.trim() : '';
    if (lastName.length > NAME_MAX) {
      throw new ClientCardError(`Прізвище до ${NAME_MAX} символів`, 400, 'bad-last-name', {
        field: 'lastName',
      });
    }
    out.lastName = lastName;
  }

  if (!partial || b.phone !== undefined) {
    const phone = typeof b.phone === 'string' ? normalizePhone(b.phone) : null;
    if (!phone) {
      throw new ClientCardError('Вкажіть коректний номер телефону', 400, 'bad-phone', {
        field: 'phone',
      });
    }
    out.phone = phone.phone;
    out.phoneRaw = phone.phoneRaw;
    out.isForeign = phone.isForeign;
  }

  if (b.email !== undefined) {
    const email = typeof b.email === 'string' ? b.email.trim().toLowerCase() : '';
    if (email !== '' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new ClientCardError('Некоректна пошта', 400, 'bad-email', { field: 'email' });
    }
    out.email = email;
  }

  if (b.adminNote !== undefined) {
    const note = typeof b.adminNote === 'string' ? b.adminNote.trim() : '';
    if (note.length > NOTE_MAX) {
      throw new ClientCardError(`Нотатка до ${NOTE_MAX} символів`, 400, 'bad-note', {
        field: 'adminNote',
      });
    }
    out.adminNote = note;
  }

  return out;
}

function toObjectId(id: string): ObjectId {
  if (!ObjectId.isValid(id)) throw new ClientCardError('Клієнта не знайдено', 404, 'no-client');
  return new ObjectId(id);
}

export async function requireClient(db: Db, id: string): Promise<Client> {
  const client = await db.collection<Client>(CLIENT_COLLECTION).findOne({ _id: toObjectId(id) });
  if (!client) throw new ClientCardError('Клієнта не знайдено', 404, 'no-client');
  return client;
}

/** Один телефон — одна картка: інакше історія візитів розпадеться на дві. */
async function assertPhoneFree(db: Db, phone: string, phoneRaw: string, exceptId?: ObjectId) {
  const existing = await db.collection<Client>(CLIENT_COLLECTION).findOne(
    {
      $or: [{ phone }, { phoneRaw }],
      ...(exceptId ? { _id: { $ne: exceptId } } : {}),
    },
    { projection: { _id: 1, name: 1 } }
  );
  if (existing) {
    throw new ClientCardError(
      `Клієнт із цим номером уже є: ${existing.name}`,
      409,
      'client-exists',
      { field: 'phone', existingId: existing._id!.toHexString() }
    );
  }
}

export async function createClient(db: Db, input: Partial<ClientInput>): Promise<Client> {
  await assertPhoneFree(db, input.phone!, input.phoneRaw!);

  const client: Client = {
    phone: input.phone!,
    phoneRaw: input.phoneRaw!,
    name: input.name!,
    ...(input.lastName ? { lastName: input.lastName } : {}),
    ...(input.email ? { email: input.email } : {}),
    ...(input.adminNote ? { adminNote: input.adminNote } : {}),
    lastVisitAt: null,
    visitsCount: 0,
    totalSpent: 0,
    crmGroup: 'Новий',
    dateSource: 'адмінка',
    isForeign: input.isForeign ?? false,
    doNotContact: false,
    lastNotifiedAt: null,
    notifyHistory: [],
    importedAt: new Date(),
  };

  const { insertedId } = await db.collection<Client>(CLIENT_COLLECTION).insertOne(client);
  return { ...client, _id: insertedId };
}

export async function updateClient(
  db: Db,
  id: string,
  input: Partial<ClientInput>
): Promise<Client> {
  const client = await requireClient(db, id);
  if (input.phone && input.phone !== client.phone) {
    await assertPhoneFree(db, input.phone, input.phoneRaw!, client._id!);
  }

  const set: Partial<Client> = {};
  const unset: Record<string, ''> = {};
  for (const key of ['name', 'phone', 'phoneRaw', 'isForeign'] as const) {
    if (input[key] !== undefined) (set as Record<string, unknown>)[key] = input[key];
  }
  // Порожній рядок — «прибрати поле», а не зберегти ''.
  for (const key of ['lastName', 'email', 'adminNote'] as const) {
    if (input[key] === undefined) continue;
    if (input[key] === '') unset[key] = '';
    else (set as Record<string, unknown>)[key] = input[key];
  }

  if (Object.keys(set).length || Object.keys(unset).length) {
    await db.collection<Client>(CLIENT_COLLECTION).updateOne(
      { _id: client._id! },
      { ...(Object.keys(set).length ? { $set: set } : {}), ...(Object.keys(unset).length ? { $unset: unset } : {}) }
    );
  }

  return (await db.collection<Client>(CLIENT_COLLECTION).findOne({ _id: client._id! }))!;
}

export interface RebookHint {
  text: string;
  /** Коли минув звичний інтервал: останній візит + середній інтервал. */
  dueAt: string;
}

/**
 * «Пора записати»: звичний інтервал уже минув, а наступного візиту ще немає.
 * Без двох завершених візитів інтервалу немає — і підказки теж.
 */
export function rebookHint(
  stats: Omit<ClientStats, '_id'>,
  hasUpcoming: boolean,
  now = Date.now()
): RebookHint | null {
  const avg = avgIntervalMs(stats);
  if (avg === null || !stats.lastVisitAt || hasUpcoming) return null;

  const due = stats.lastVisitAt.getTime() + avg;
  if (now < due) return null;

  const days = Math.round(avg / DAY);
  const overdue = Math.round((now - due) / DAY);
  return {
    text:
      overdue > 0
        ? `Пора записати: зазвичай приходить раз на ${days} дн., звичний інтервал минув ${overdue} дн. тому`
        : `Пора записати: зазвичай приходить раз на ${days} дн.`,
    dueAt: new Date(due).toISOString(),
  };
}

/** Повна картка для адміна: контакти, нотатка, агрегати, улюбленці, останні візити. */
export async function getClientCard(db: Db, id: string) {
  const client = await requireClient(db, id);
  const clientId = client._id!;
  const table = await loadPriceTable(db);

  const [statsRows, recent, upcoming, pets, traits] = await Promise.all([
    db
      .collection(ORDER_COLLECTION)
      .aggregate<ClientStats>(statsPipeline(table, { clientId }))
      .toArray(),
    db
      .collection<Order & { price: number }>(ORDER_COLLECTION)
      .aggregate<Order & { price: number }>([
        // Минулі й сьогоднішні: майбутній запис — це «наступний візит», не історія.
        { $match: { clientId, scheduledAt: { $lte: new Date() } } },
        { $sort: { scheduledAt: -1 } },
        { $limit: RECENT_VISITS },
        { $set: { price: priceExpr(table) } },
      ])
      .toArray(),
    db
      .collection<Order>(ORDER_COLLECTION)
      .find({ clientId, status: 'pending', scheduledAt: { $gt: new Date() } })
      .sort({ scheduledAt: 1 })
      .limit(1)
      .toArray(),
    listPets(db, clientId),
    fetchActiveTraits(db),
  ]);

  const stats = statsRows[0] ?? EMPTY_STATS;
  const next = upcoming[0] ?? null;
  const avg = avgIntervalMs(stats);

  const groomerIds = [
    ...new Set([...recent, ...(next ? [next] : [])].map((o) => o.groomerId.toHexString())),
  ].map(
    (g) => new ObjectId(g)
  );
  const serviceIds = [...new Set(recent.flatMap((o) => o.serviceIds.map((s) => s.toHexString())))].map(
    (s) => new ObjectId(s)
  );
  const petIds = [...new Set(recent.map((o) => o.petId.toHexString()))].map((p) => new ObjectId(p));

  const [groomers, services, visitPets] = await Promise.all([
    db
      .collection<User>(USER_COLLECTION)
      .find({ _id: { $in: groomerIds } }, { projection: { username: 1 } })
      .toArray(),
    db
      .collection<Service>(SERVICE_COLLECTION)
      .find({ _id: { $in: serviceIds } }, { projection: { type: 1 } })
      .toArray(),
    db
      .collection<Pet>(PET_COLLECTION)
      .find({ _id: { $in: petIds } }, { projection: { name: 1 } })
      .toArray(),
  ]);

  const groomerName = new Map(groomers.map((g) => [g._id!.toHexString(), g.username]));
  const serviceName = new Map(services.map((s) => [s._id!.toHexString(), s.type]));
  const petName = new Map(visitPets.map((p) => [p._id!.toHexString(), p.name]));
  const traitByKey = new Map(traits.map((t) => [t.key, t]));
  const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null);
  const segments: Segment[] = segmentsOf(stats);

  return {
    id: clientId.toHexString(),
    name: client.name,
    lastName: client.lastName ?? '',
    phone: client.phone,
    email: client.email ?? '',
    doNotContact: client.doNotContact === true,
    source: client.dateSource ?? '',
    /** «Клієнт з …»: дата зі старої CRM, інакше перший візит, інакше створення картки. */
    since: iso(client.clientSince ?? stats.firstVisitAt ?? client.firstVisitAt ?? client.importedAt),
    /** Лише для персоналу. У кабінет клієнта ніколи не віддається. */
    adminNote: client.adminNote ?? '',
    segments,
    stats: {
      visitsCount: stats.visitsCount,
      spent: stats.spent,
      firstVisitAt: iso(stats.firstVisitAt),
      lastVisitAt: iso(stats.lastVisitAt),
      avgIntervalDays: avg === null ? null : Math.round(avg / DAY),
      hasOrders: stats.ordersCount > 0,
      hasUpcoming: next !== null,
    },
    nextVisit: next
      ? {
          id: next._id!.toHexString(),
          scheduledAt: next.scheduledAt.toISOString(),
          groomer: {
            id: next.groomerId.toHexString(),
            name: groomerName.get(next.groomerId.toHexString()) ?? '',
          },
        }
      : null,
    rebookHint: rebookHint(stats, next !== null),
    pets: await Promise.all(
      pets.map(async (pet) => {
        const dto = await toAccountPetDTO(db, pet);
        return {
          ...dto,
          // Шкали характеру з підписами — картка не має знати довідник окремо.
          traits: (pet.traits ?? [])
            .map((t) => {
              const trait = traitByKey.get(t.traitKey);
              return trait
                ? {
                    key: trait.key,
                    label: trait.label,
                    minLabel: trait.minLabel,
                    maxLabel: trait.maxLabel,
                    value: t.value,
                  }
                : null;
            })
            .filter((t): t is NonNullable<typeof t> => t !== null),
        };
      })
    ),
    visits: recent.map((o) => ({
      id: o._id!.toHexString(),
      scheduledAt: o.scheduledAt.toISOString(),
      status: o.status,
      petName: petName.get(o.petId.toHexString()) ?? null,
      groomer: {
        id: o.groomerId.toHexString(),
        name: groomerName.get(o.groomerId.toHexString()) ?? '',
      },
      services: o.serviceIds
        .map((s) => serviceName.get(s.toHexString()))
        .filter((n): n is string => Boolean(n)),
      total: o.price,
    })),
  };
}
