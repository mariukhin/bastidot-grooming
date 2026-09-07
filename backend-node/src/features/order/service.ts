import type { Db } from 'mongodb';
import { ObjectId } from 'mongodb';
import {
  ORDER_COLLECTION,
  type Order,
  type BusySlot,
  type CreateOrderInput,
} from './types.ts';
// Крос-фічеві типи. User/Pet — не специфічні для groomer/pet, тож у
// «дорослому» проєкті жили б у shared/. Поки імпортуємо звідти, де є.
import { USER_COLLECTION, type User } from '../../shared/user.ts';
import { CLIENT_COLLECTION, type Client } from '../../shared/client.ts';
import { PET_COLLECTION, type Pet } from '../pet/types.ts';
import BreedService from '../breed/service.ts';
import { normalizePhone } from '../../shared/phone.ts';

async function findOrCreateClient(db: Db, input: CreateOrderInput): Promise<Client> {
  const clients = db.collection<Client>(CLIENT_COLLECTION);

  const phone = normalizePhone(input.clientPhone);
  if (!phone) {
    throw new Error('invalid clientPhone');
  }

  const existing = await clients.findOne({
    $or: [{ phone: phone.phone }, { phoneRaw: phone.phoneRaw }],
  });
  if (existing) {
    return existing;
  }

  const now = new Date();
  const client: Client = {
    phone: phone.phone,
    phoneRaw: phone.phoneRaw,
    name: input.clientName,
    lastVisitAt: null,
    visitsCount: 0,
    totalSpent: 0,
    crmGroup: 'Новий',
    dateSource: 'сайт',
    isForeign: phone.isForeign,
    doNotContact: false,
    lastNotifiedAt: null,
    notifyHistory: [],
    importedAt: now,
  };
  if (input.clientEmail) {
    client.email = input.clientEmail;
  }

  const result = await clients.insertOne(client);
  return { ...client, _id: result.insertedId };
}

// Знаходить тваринку цього клієнта за іменем або створює нову.
// Ключ — (userId, name): в одного власника не буває двох тваринок з
// однаковим іменем, а в різних власників — може.
async function findOrCreatePet(db: Db, input: CreateOrderInput, clientId: ObjectId): Promise<Pet> {
  const pets = db.collection<Pet>(PET_COLLECTION);
  const breedId = await BreedService.resolveId(db, input.petBreedId);

  const existing = await pets.findOne({ userId: clientId, name: input.petName });
  if (existing) {
    if (breedId && !existing.breedId) {
      await pets.updateOne({ _id: existing._id }, { $set: { breedId } });
      return { ...existing, breedId };
    }
    return existing;
  }

  const pet: Pet = {
    name: input.petName,
    age: input.petAge ?? 0,
    weight: input.petWeight ?? 0,
    photoUrl: input.petPhotoUrl ?? '',
    userId: clientId,
    breedId,
    createdAt: new Date(),
    comment: input.petComment ?? '',
  };

  const result = await pets.insertOne(pet);
  return { ...pet, _id: result.insertedId };
}

async function createOrder(db: Db, input: CreateOrderInput): Promise<Order> {
  // 1. Грумер має існувати і бути грумером — лише прив'язуємо, не створюємо.
  if (!ObjectId.isValid(input.groomerId)) {
    throw new Error('invalid groomerId');
  }
  const groomerId = new ObjectId(input.groomerId);
  const groomer = await db.collection<User>(USER_COLLECTION).findOne({ _id: groomerId });
  if (!groomer) {
    throw new Error('groomer not found');
  }
  if (!groomer.isGroomer) {
    throw new Error('specified user is not a groomer');
  }

  // 2. Клієнт і тваринка — find-or-create.
  const client = await findOrCreateClient(db, input);
  const clientId = client._id!;
  const pet = await findOrCreatePet(db, input, clientId);

  // 3. serviceIds рядки → ObjectId (з валідацією кожного).
  const serviceIds = (input.serviceIds ?? []).map((id) => {
    if (!ObjectId.isValid(id)) {
      throw new Error(`invalid serviceId: ${id}`);
    }
    return new ObjectId(id);
  });

  // 4. Збірка замовлення. Статус pending + перший запис в історію.
  const now = new Date();
  const order: Order = {
    clientId,
    petId: pet._id!,
    groomerId,
    createdAt: now,
    scheduledAt: new Date(input.scheduledAt),
    durationMinutes: input.durationMinutes,
    status: 'pending',
    statusHistory: [{ status: 'pending', changedAt: now }],
    comment: input.comment ?? '',
    serviceIds,
  };

  const result = await db.collection<Order>(ORDER_COLLECTION).insertOne(order);
  return { ...order, _id: result.insertedId };
}

// Зайняті інтервали грумера за діапазон дат [from, to] включно.
// Скасовані замовлення не рахуються — їхній час знову вільний.
async function fetchBusySlots(
  db: Db,
  groomerId: string,
  from: string,
  to: string
): Promise<BusySlot[]> {
  if (!ObjectId.isValid(groomerId)) {
    throw new Error('invalid groomerId');
  }

  const rangeStart = new Date(`${from}T00:00:00.000Z`);
  // Кінець діапазону — початок дня ПІСЛЯ to, щоб охопити весь день to.
  const rangeEnd = new Date(`${to}T00:00:00.000Z`);
  rangeEnd.setUTCDate(rangeEnd.getUTCDate() + 1);

  const orders = await db
    .collection<Order>(ORDER_COLLECTION)
    .find({
      groomerId: new ObjectId(groomerId),
      scheduledAt: { $gte: rangeStart, $lt: rangeEnd },
      status: { $ne: 'cancelled' },
    })
    .toArray();

  return orders.map((o) => ({
    scheduledAt: o.scheduledAt,
    durationMinutes: o.durationMinutes,
  }));
}

const OrderService = {
  createOrder,
  fetchBusySlots,
};

export default OrderService;
