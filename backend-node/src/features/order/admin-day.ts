import { ObjectId } from 'mongodb';
import type { Db } from 'mongodb';

import { USER_COLLECTION, type User } from '../../shared/user.ts';
import { CLIENT_COLLECTION, type Client } from '../../shared/client.ts';
import { SERVICE_COLLECTION, type Service } from '../service/types.ts';
import { PET_COLLECTION, type Pet } from '../pet/types.ts';
import { intervalsFor } from '../schedule/service.ts';
import { SCHEDULE_COLLECTION, type GroomerSchedule } from '../schedule/types.ts';
import { dateInZone, isDateString, minutesOf, zonedToUtc } from '../schedule/time.ts';
import { hasConflict } from './service.ts';
import { ORDER_COLLECTION, type Order } from './types.ts';

export class AdminError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(message: string, status: number, code: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export interface AdminOrderDTO {
  id: string;
  scheduledAt: string;
  durationMinutes: number;
  status: Order['status'];
  confirmedAt: string | null;
  comment: string;
  groomerNote: string;
  client: { name: string; phone: string };
  pet: { name: string; breedName: string | null } | null;
  groomer: { id: string; name: string } | null;
  services: { id: string; name: string; price: number }[];
  total: number;
  /** Звідки прийшов клієнт: поле картки в CRM («сайт», «кабінет», «стара CRM»…). */
  source: string;
}

function dayRange(date: string): { from: Date; to: Date } {
  const from = zonedToUtc(date, '00:00');
  return { from, to: new Date(from.getTime() + 24 * 60 * 60 * 1000) };
}

function requireDate(date: string): string {
  if (date && !isDateString(date)) {
    throw new AdminError('Дата має бути YYYY-MM-DD', 400, 'bad-date');
  }
  return date || dateInZone(new Date());
}

async function enrich(db: Db, orders: Order[]): Promise<AdminOrderDTO[]> {
  if (orders.length === 0) return [];

  const ids = (get: (o: Order) => ObjectId | ObjectId[]) => [
    ...new Set(orders.flatMap((o) => [get(o)].flat().map((id) => id.toHexString()))),
  ].map((id) => new ObjectId(id));

  const [clients, pets, groomers, services] = await Promise.all([
    db.collection<Client>(CLIENT_COLLECTION).find({ _id: { $in: ids((o) => o.clientId) } }).toArray(),
    db.collection<Pet>(PET_COLLECTION).find({ _id: { $in: ids((o) => o.petId) } }).toArray(),
    db.collection<User>(USER_COLLECTION).find({ _id: { $in: ids((o) => o.groomerId) } }).toArray(),
    db
      .collection<Service>(SERVICE_COLLECTION)
      .find({ _id: { $in: ids((o) => o.serviceIds) } })
      .toArray(),
  ]);

  const breedIds = pets.map((p) => p.breedId).filter((id): id is ObjectId => Boolean(id));
  const breeds =
    breedIds.length > 0
      ? await db.collection<{ _id: ObjectId; name: string }>('breed').find({ _id: { $in: breedIds } }).toArray()
      : [];

  const clientById = new Map(clients.map((c) => [c._id!.toHexString(), c]));
  const petById = new Map(pets.map((p) => [p._id!.toHexString(), p]));
  const groomerById = new Map(groomers.map((g) => [g._id!.toHexString(), g]));
  const serviceById = new Map(services.map((s) => [s._id!.toHexString(), s]));
  const breedById = new Map(breeds.map((b) => [b._id.toHexString(), b.name]));

  return orders.map((order) => {
    const client = clientById.get(order.clientId.toHexString());
    const pet = petById.get(order.petId.toHexString());
    const groomer = groomerById.get(order.groomerId.toHexString());
    const isVip = groomer?.isVip ?? false;

    const items = order.serviceIds.map((id) => {
      const service = serviceById.get(id.toHexString());
      const vip = isVip ? service?.vipPrice : null;
      return {
        id: id.toHexString(),
        name: service?.type ?? 'Послугу більше не надаємо',
        price: typeof vip === 'number' ? vip : (service?.defaultPrice ?? 0),
      };
    });

    return {
      id: order._id!.toHexString(),
      scheduledAt: order.scheduledAt.toISOString(),
      durationMinutes: order.durationMinutes,
      status: order.status,
      confirmedAt: order.confirmedAt ? order.confirmedAt.toISOString() : null,
      comment: order.comment ?? '',
      groomerNote: order.groomerNote ?? '',
      client: { name: client?.name ?? '', phone: client?.phone ?? '' },
      pet: pet
        ? {
            name: pet.name,
            breedName: pet.breedId
              ? (breedById.get(pet.breedId.toHexString()) ?? null)
              : (pet.breedCustom ?? null),
          }
        : null,
      groomer: groomer ? { id: groomer._id!.toHexString(), name: groomer.username } : null,
      services: items,
      total: items.reduce((sum, item) => sum + item.price, 0),
      source: order.source || (client?.dateSource ?? ''),
    };
  });
}

export async function listAdminDay(
  db: Db,
  rawDate: string,
  groomerId: string
): Promise<{ date: string; orders: AdminOrderDTO[] }> {
  const date = requireDate(rawDate);
  const { from, to } = dayRange(date);

  if (groomerId && !ObjectId.isValid(groomerId)) {
    throw new AdminError('Некоректний groomerId', 400, 'bad-groomer');
  }

  const orders = await db
    .collection<Order>(ORDER_COLLECTION)
    .find({
      scheduledAt: { $gte: from, $lt: to },
      ...(groomerId ? { groomerId: new ObjectId(groomerId) } : {}),
    })
    .sort({ scheduledAt: 1 })
    .toArray();

  return { date, orders: await enrich(db, orders) };
}

export interface AdminStats {
  date: string;
  total: number;
  cancelled: number;
  unconfirmed: number;
  bookedMinutes: number;
  workingMinutes: number;
  /** Частка зайнятого робочого часу, 0–1. */
  utilization: number;
  expectedRevenue: number;
}

export async function adminStats(db: Db, rawDate: string): Promise<AdminStats> {
  const date = requireDate(rawDate);
  const { orders } = await listAdminDay(db, date, '');

  const active = orders.filter((o) => o.status !== 'cancelled');
  const bookedMinutes = active.reduce((sum, o) => sum + o.durationMinutes, 0);

  const groomers = await db
    .collection<User>(USER_COLLECTION)
    .find({ isGroomer: true }, { projection: { _id: 1 } })
    .toArray();
  const schedules = await db
    .collection<GroomerSchedule>(SCHEDULE_COLLECTION)
    .find({ groomerId: { $in: groomers.map((g) => g._id!) } })
    .toArray();
  const byGroomer = new Map(schedules.map((s) => [s.groomerId.toHexString(), s]));

  const workingMinutes = groomers.reduce((sum, groomer) => {
    const doc = byGroomer.get(groomer._id!.toHexString()) ?? { weekly: [], exceptions: [] };
    const { intervals } = intervalsFor(doc, date);
    return sum + intervals.reduce((d, i) => d + (minutesOf(i.to) - minutesOf(i.from)), 0);
  }, 0);

  return {
    date,
    total: orders.length,
    cancelled: orders.length - active.length,
    // Непідтверджені — ті, які салон ще не підтвердив і які не скасовані.
    unconfirmed: active.filter((o) => !o.confirmedAt).length,
    bookedMinutes,
    workingMinutes,
    utilization: workingMinutes > 0 ? Math.round((bookedMinutes / workingMinutes) * 100) / 100 : 0,
    expectedRevenue: active.reduce((sum, o) => sum + o.total, 0),
  };
}

async function loadOrder(db: Db, orderId: string): Promise<Order> {
  if (!ObjectId.isValid(orderId)) {
    throw new AdminError('Запис не знайдено', 404, 'no-order');
  }
  const order = await db.collection<Order>(ORDER_COLLECTION).findOne({ _id: new ObjectId(orderId) });
  if (!order) {
    throw new AdminError('Запис не знайдено', 404, 'no-order');
  }
  return order;
}

/** Спільний хвіст усіх дій: запис у історію і свіжий DTO. */
async function applyChange(
  db: Db,
  order: Order,
  adminId: ObjectId,
  patch: Partial<Order>,
  note: string
): Promise<AdminOrderDTO> {
  const change = {
    status: (patch.status ?? order.status) as Order['status'],
    changedAt: new Date(),
    changedBy: adminId,
    note,
  };

  await db
    .collection<Order>(ORDER_COLLECTION)
    .updateOne({ _id: order._id! }, { $set: patch, $push: { statusHistory: change } });

  const fresh = await loadOrder(db, order._id!.toHexString());
  const [dto] = await enrich(db, [fresh]);
  return dto!;
}

export async function confirmOrder(db: Db, adminId: string, orderId: string): Promise<AdminOrderDTO> {
  const order = await loadOrder(db, orderId);

  if (order.status === 'cancelled') {
    throw new AdminError('Скасований запис підтвердити не можна', 409, 'cancelled');
  }

  return await applyChange(
    db,
    order,
    new ObjectId(adminId),
    { confirmedAt: new Date(), confirmedBy: new ObjectId(adminId) },
    'Підтверджено адміністратором'
  );
}

export async function cancelAsAdmin(db: Db, adminId: string, orderId: string): Promise<AdminOrderDTO> {
  const order = await loadOrder(db, orderId);

  if (order.status === 'cancelled') {
    throw new AdminError('Запис уже скасований', 409, 'already-cancelled');
  }

  // Cutoff навмисно не перевіряємо: він існує, щоб клієнт не зривав візит за
  // десять хвилин до початку, а салон має право скасувати будь-коли.
  return await applyChange(
    db,
    order,
    new ObjectId(adminId),
    { status: 'cancelled' },
    'Скасовано адміністратором'
  );
}

export async function rescheduleAsAdmin(
  db: Db,
  adminId: string,
  orderId: string,
  scheduledAtRaw: string,
  durationRaw: unknown
): Promise<AdminOrderDTO> {
  const order = await loadOrder(db, orderId);
  const scheduledAt = new Date(scheduledAtRaw);

  if (Number.isNaN(scheduledAt.getTime())) {
    throw new AdminError('Некоректний час візиту', 400, 'bad-date');
  }
  if (order.status === 'cancelled') {
    throw new AdminError('Скасований запис перенести не можна', 409, 'cancelled');
  }

  const durationMinutes =
    typeof durationRaw === 'number' && durationRaw > 0 ? durationRaw : order.durationMinutes;

  if (await hasConflict(db, order.groomerId, scheduledAt, durationMinutes, order._id!)) {
    throw new AdminError('Цей час у грумера вже зайнятий', 409, 'slot-taken');
  }

  return await applyChange(
    db,
    order,
    new ObjectId(adminId),
    { scheduledAt, durationMinutes },
    'Перенесено адміністратором'
  );
}

export async function reassignGroomer(
  db: Db,
  adminId: string,
  orderId: string,
  groomerIdRaw: string
): Promise<AdminOrderDTO> {
  const order = await loadOrder(db, orderId);

  if (!ObjectId.isValid(groomerIdRaw)) {
    throw new AdminError('Грумера не знайдено', 404, 'no-groomer');
  }
  if (order.status === 'cancelled') {
    throw new AdminError('Скасований запис перепризначити не можна', 409, 'cancelled');
  }

  const groomerId = new ObjectId(groomerIdRaw);
  const groomer = await db
    .collection<User>(USER_COLLECTION)
    .findOne({ _id: groomerId, isGroomer: true }, { projection: { _id: 1 } });

  if (!groomer) {
    throw new AdminError('Грумера не знайдено', 404, 'no-groomer');
  }
  if (await hasConflict(db, groomerId, order.scheduledAt, order.durationMinutes, order._id!)) {
    throw new AdminError('У цього грумера той час уже зайнятий', 409, 'slot-taken');
  }

  return await applyChange(db, order, new ObjectId(adminId), { groomerId }, 'Змінено грумера');
}
