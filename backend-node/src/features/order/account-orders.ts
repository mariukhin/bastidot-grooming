import { ObjectId } from 'mongodb';
import type { Db, Filter } from 'mongodb';

import { config } from '../../shared/config.ts';
import { USER_COLLECTION, type User } from '../../shared/user.ts';
import { PET_COLLECTION, type Pet } from '../pet/types.ts';
import { BREED_COLLECTION, type Breed } from '../breed/types.ts';
import { SERVICE_COLLECTION, type Service } from '../service/types.ts';
import { ORDER_COLLECTION, type Order } from './types.ts';

export type OrderScope = 'upcoming' | 'past';

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

export interface AccountOrderDTO {
  id: string;
  scheduledAt: string;
  durationMinutes: number;
  status: Order['status'];
  comment: string;
  pet: { id: string; name: string; photoUrl: string | null; breedName: string | null } | null;
  groomer: { id: string; name: string; photoUrl: string | null; isActive: boolean } | null;
  services: { id: string; name: string; price: number; isActive: boolean }[];
  breedId: string | null;
  total: number;
  canCancel: boolean;
  canReschedule: boolean;
}

export interface AccountOrdersPage {
  items: AccountOrderDTO[];
  nextCursor: string | null;
}

/**
 * Курсор — час візиту плюс id.
 *
 * Самого scheduledAt замало: кілька записів можуть збігтися до секунди, і без
 * стабільного доважка сторінки або губили б записи, або дублювали їх.
 */
function encodeCursor(order: Order): string {
  return Buffer.from(`${order.scheduledAt.toISOString()}|${order._id!.toHexString()}`).toString(
    'base64url'
  );
}

function decodeCursor(cursor: string): { scheduledAt: Date; id: ObjectId } | null {
  try {
    const [iso, id] = Buffer.from(cursor, 'base64url').toString('utf8').split('|');
    if (!iso || !id || !ObjectId.isValid(id)) return null;

    const scheduledAt = new Date(iso);
    if (Number.isNaN(scheduledAt.getTime())) return null;

    return { scheduledAt, id: new ObjectId(id) };
  } catch {
    return null;
  }
}

/**
 * «Майбутні» — лише ті, на які ще можна прийти: час попереду і запис не
 * скасований. Скасований завтрашній візит для клієнта вже історія, а не план,
 * тож він потрапляє в past разом із рештою.
 */
function buildFilter(clientId: ObjectId, scope: OrderScope, now: Date): Filter<Order> {
  if (scope === 'upcoming') {
    return { clientId, status: 'pending', scheduledAt: { $gte: now } };
  }
  return {
    clientId,
    $or: [{ scheduledAt: { $lt: now } }, { status: { $ne: 'pending' } }],
  };
}

export async function listAccountOrders(
  db: Db,
  clientId: ObjectId,
  scope: OrderScope,
  cursor: string | null,
  limit = DEFAULT_LIMIT
): Promise<AccountOrdersPage> {
  const now = new Date();
  const size = Math.min(Math.max(limit, 1), MAX_LIMIT);
  // Майбутні — від найближчого, минулі — від найсвіжішого.
  const direction = scope === 'upcoming' ? 1 : -1;

  const decoded = cursor ? decodeCursor(cursor) : null;
  const conditions: Filter<Order>[] = [buildFilter(clientId, scope, now)];

  if (decoded) {
    // «Строго після курсора» за парою (scheduledAt, _id) — у тому ж порядку,
    // у якому сортуємо.
    const op = direction === 1 ? '$gt' : '$lt';
    conditions.push({
      $or: [
        { scheduledAt: { [op]: decoded.scheduledAt } },
        { scheduledAt: decoded.scheduledAt, _id: { [op]: decoded.id } },
      ],
    } as Filter<Order>);
  }

  // $and, а не злиття в один обʼєкт: і базовий фільтр, і курсор містять $or,
  // і при злитті другий мовчки затер би перший.
  const filter: Filter<Order> = conditions.length === 1 ? conditions[0]! : { $and: conditions };

  // Беремо на один більше — так дізнаємось, чи є наступна сторінка, без
  // окремого countDocuments по всій колекції.
  const rows = await db
    .collection<Order>(ORDER_COLLECTION)
    .find(filter)
    .sort({ scheduledAt: direction, _id: direction })
    .limit(size + 1)
    .toArray();

  const hasMore = rows.length > size;
  const page = hasMore ? rows.slice(0, size) : rows;

  return {
    items: await enrich(db, page, now),
    nextCursor: hasMore && page.length > 0 ? encodeCursor(page[page.length - 1]!) : null,
  };
}

/** Одна вибірка на сторінку замість запиту на кожен запис. */
async function enrich(db: Db, orders: Order[], now: Date): Promise<AccountOrderDTO[]> {
  if (orders.length === 0) return [];

  const petIds = [...new Set(orders.map((o) => o.petId.toHexString()))].map((id) => new ObjectId(id));
  const groomerIds = [...new Set(orders.map((o) => o.groomerId.toHexString()))].map(
    (id) => new ObjectId(id)
  );
  const serviceIds = [...new Set(orders.flatMap((o) => o.serviceIds.map((s) => s.toHexString())))].map(
    (id) => new ObjectId(id)
  );

  const [pets, groomers, services] = await Promise.all([
    db.collection<Pet>(PET_COLLECTION).find({ _id: { $in: petIds } }).toArray(),
    db
      .collection<User>(USER_COLLECTION)
      .find({ _id: { $in: groomerIds } }, { projection: { username: 1, photoUrl: 1, isGroomer: 1, isVip: 1 } })
      .toArray(),
    serviceIds.length > 0
      ? db.collection<Service>(SERVICE_COLLECTION).find({ _id: { $in: serviceIds } }).toArray()
      : Promise.resolve([]),
  ]);

  const breedIds = pets.map((p) => p.breedId).filter((id): id is ObjectId => Boolean(id));
  const breeds =
    breedIds.length > 0
      ? await db.collection<Breed>(BREED_COLLECTION).find({ _id: { $in: breedIds } }).toArray()
      : [];

  const breedById = new Map(breeds.map((b) => [b._id.toHexString(), b.name]));
  const petById = new Map(pets.map((p) => [p._id!.toHexString(), p]));
  const groomerById = new Map(groomers.map((g) => [g._id!.toHexString(), g]));
  const serviceById = new Map(services.map((s) => [s._id!.toHexString(), s]));

  const cutoffMs = config.orderSelfServiceCutoffHours * 60 * 60 * 1000;

  return orders.map((order) => {
    const pet = petById.get(order.petId.toHexString());
    const groomer = groomerById.get(order.groomerId.toHexString());
    const isVip = groomer?.isVip ?? false;

    const items = order.serviceIds.map((id) => {
      const service = serviceById.get(id.toHexString());
      if (!service) {
        // Послугу прибрали з каталогу — показуємо заглушку, щоб рядок у
        // списку не зник і сума залишилась зрозумілою.
        return { id: id.toHexString(), name: 'Послугу більше не надаємо', price: 0, isActive: false };
      }
      const vip = isVip ? service.vipPrice : null;
      return {
        id: id.toHexString(),
        name: service.type,
        price: typeof vip === 'number' ? vip : (service.defaultPrice ?? 0),
        isActive: true,
      };
    });

    const breedId =
      pet?.breedId ??
      serviceById.get(order.serviceIds[0]?.toHexString() ?? '')?.breedId ??
      null;

    const changeable =
      order.status === 'pending' && order.scheduledAt.getTime() - now.getTime() >= cutoffMs;

    return {
      id: order._id!.toHexString(),
      scheduledAt: order.scheduledAt.toISOString(),
      durationMinutes: order.durationMinutes,
      status: order.status,
      comment: order.comment ?? '',
      pet: pet
        ? {
            id: pet._id!.toHexString(),
            name: pet.name,
            photoUrl: pet.photoUrl || null,
            breedName: pet.breedId
              ? (breedById.get(pet.breedId.toHexString()) ?? null)
              : (pet.breedCustom ?? null),
          }
        : null,
      groomer: groomer
        ? {
            id: groomer._id!.toHexString(),
            name: groomer.username,
            photoUrl: groomer.photoUrl || null,
            // Грумер міг піти з салону — запис лишається, але повторити його
            // на цю людину вже не можна.
            isActive: groomer.isGroomer === true,
          }
        : null,
      services: items,
      breedId: breedId ? breedId.toHexString() : null,
      total: items.reduce((sum, item) => sum + item.price, 0),
      canCancel: changeable,
      canReschedule: changeable,
    };
  });
}
