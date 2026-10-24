import { ObjectId } from 'mongodb';
import type { Db } from 'mongodb';

import { USER_COLLECTION, type User } from '../../shared/user.ts';
import { CLIENT_COLLECTION, type Client } from '../../shared/client.ts';
import { BREED_COLLECTION, type Breed } from '../breed/types.ts';
import { SERVICE_COLLECTION, type Service } from '../service/types.ts';
import { PET_COLLECTION, type Pet } from '../pet/types.ts';
import { fetchActiveTraits } from '../pet/traits.ts';
import { dateInZone, isDateString, zonedToUtc } from '../schedule/time.ts';
import { ORDER_COLLECTION, type Order } from './types.ts';

export interface GroomerOrderDTO {
  id: string;
  scheduledAt: string;
  durationMinutes: number;
  status: Order['status'];
  comment: string;
  services: string[];
  ownerName: string;
  pet: {
    name: string;
    breedName: string | null;
    weight: number | null;
    ageMonths: number | null;
    wishes: string;
    traits: { key: string; label: string; minLabel: string; maxLabel: string; value: number }[];
  } | null;
  /** Коментарі до минулих візитів цього ж улюбленця, найсвіжіші згори. */
  history: { scheduledAt: string; status: Order['status']; comment: string }[];
}

export class GroomerDayError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function ageMonths(pet: Pet): number | null {
  if (pet.birthDate) {
    const birth = new Date(pet.birthDate);
    const now = new Date();
    const months =
      (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
    return months >= 0 ? months : null;
  }
  return typeof pet.age === 'number' && pet.age > 0 ? pet.age * 12 : null;
}

async function buildDTOs(db: Db, orders: Order[]): Promise<GroomerOrderDTO[]> {
  if (orders.length === 0) return [];

  const petIds = [...new Set(orders.map((o) => o.petId.toHexString()))].map((id) => new ObjectId(id));
  const clientIds = [...new Set(orders.map((o) => o.clientId.toHexString()))].map(
    (id) => new ObjectId(id)
  );
  const serviceIds = [
    ...new Set(orders.flatMap((o) => o.serviceIds.map((s) => s.toHexString()))),
  ].map((id) => new ObjectId(id));

  const [pets, clients, services, traits] = await Promise.all([
    db.collection<Pet>(PET_COLLECTION).find({ _id: { $in: petIds } }).toArray(),
    db
      .collection<Client>(CLIENT_COLLECTION)
      .find({ _id: { $in: clientIds } }, { projection: { name: 1 } })
      .toArray(),
    serviceIds.length > 0
      ? db
          .collection<Service>(SERVICE_COLLECTION)
          .find({ _id: { $in: serviceIds } }, { projection: { type: 1 } })
          .toArray()
      : Promise.resolve([]),
    fetchActiveTraits(db),
  ]);

  const breedIds = pets.map((p) => p.breedId).filter((id): id is ObjectId => Boolean(id));
  const breeds =
    breedIds.length > 0
      ? await db.collection<Breed>(BREED_COLLECTION).find({ _id: { $in: breedIds } }).toArray()
      : [];

  // Історія — минулі візити тих самих улюбленців, крім самих цих записів.
  const past = await db
    .collection<Order>(ORDER_COLLECTION)
    .find({
      petId: { $in: petIds },
      _id: { $nin: orders.map((o) => o._id!) },
      scheduledAt: { $lt: new Date() },
    })
    .sort({ scheduledAt: -1 })
    .limit(200)
    .toArray();

  const breedById = new Map(breeds.map((b) => [b._id.toHexString(), b.name]));
  const petById = new Map(pets.map((p) => [p._id!.toHexString(), p]));
  const clientById = new Map(clients.map((c) => [c._id!.toHexString(), c.name]));
  const serviceById = new Map(services.map((s) => [s._id!.toHexString(), s.type]));
  const traitByKey = new Map(traits.map((t) => [t.key, t]));

  return orders.map((order) => {
    const pet = petById.get(order.petId.toHexString());
    const petHistory = past
      .filter((o) => o.petId.equals(order.petId) && (o.comment ?? '').trim() !== '')
      .slice(0, 5)
      .map((o) => ({
        scheduledAt: o.scheduledAt.toISOString(),
        status: o.status,
        comment: o.comment ?? '',
      }));

    return {
      id: order._id!.toHexString(),
      scheduledAt: order.scheduledAt.toISOString(),
      durationMinutes: order.durationMinutes,
      status: order.status,
      comment: order.comment ?? '',
      services: order.serviceIds
        .map((id) => serviceById.get(id.toHexString()))
        .filter((name): name is string => Boolean(name)),
      ownerName: clientById.get(order.clientId.toHexString()) ?? '',
      pet: pet
        ? {
            name: pet.name,
            breedName: pet.breedId
              ? (breedById.get(pet.breedId.toHexString()) ?? null)
              : (pet.breedCustom ?? null),
            weight: pet.weight > 0 ? pet.weight : null,
            ageMonths: ageMonths(pet),
            wishes: pet.wishes ?? '',
            traits: (pet.traits ?? [])
              .map((value) => {
                const trait = traitByKey.get(value.traitKey);
                return trait
                  ? {
                      key: trait.key,
                      label: trait.label,
                      minLabel: trait.minLabel,
                      maxLabel: trait.maxLabel,
                      value: value.value,
                    }
                  : null;
              })
              .filter((t): t is NonNullable<typeof t> => t !== null),
          }
        : null,
      history: petHistory,
    };
  });
}

/** Грумер визначається токеном: id з query дозволив би дивитись чужий день. */
async function requireGroomerId(db: Db, userId: string): Promise<ObjectId> {
  if (!ObjectId.isValid(userId)) {
    throw new GroomerDayError('Недостатньо прав', 403);
  }

  const _id = new ObjectId(userId);
  const user = await db
    .collection<User>(USER_COLLECTION)
    .findOne({ _id, isGroomer: true }, { projection: { _id: 1 } });

  if (!user) {
    throw new GroomerDayError('Недостатньо прав', 403);
  }
  return _id;
}

export async function listGroomerDay(
  db: Db,
  userId: string,
  date: string
): Promise<{ date: string; orders: GroomerOrderDTO[] }> {
  const day = isDateString(date) ? date : dateInZone(new Date());
  const groomerId = await requireGroomerId(db, userId);

  const from = zonedToUtc(day, '00:00');
  const to = new Date(from.getTime() + 24 * 60 * 60 * 1000);

  const orders = await db
    .collection<Order>(ORDER_COLLECTION)
    .find({ groomerId, scheduledAt: { $gte: from, $lt: to } })
    .sort({ scheduledAt: 1 })
    .toArray();

  return { date: day, orders: await buildDTOs(db, orders) };
}

export async function getGroomerOrder(
  db: Db,
  userId: string,
  orderId: string
): Promise<GroomerOrderDTO> {
  const groomerId = await requireGroomerId(db, userId);

  if (!ObjectId.isValid(orderId)) {
    throw new GroomerDayError('Запис не знайдено', 404);
  }

  // Чужий запис і неіснуючий дають однакову відповідь: інакше по статусу
  // можна перебрати, які записи існують у салоні.
  const order = await db
    .collection<Order>(ORDER_COLLECTION)
    .findOne({ _id: new ObjectId(orderId), groomerId });

  if (!order) {
    throw new GroomerDayError('Запис не знайдено', 404);
  }

  const [dto] = await buildDTOs(db, [order]);
  return dto!;
}
