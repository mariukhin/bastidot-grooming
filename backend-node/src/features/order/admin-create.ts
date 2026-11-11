import { ObjectId } from 'mongodb';
import type { Db } from 'mongodb';

import { USER_COLLECTION, type User } from '../../shared/user.ts';
import { CLIENT_COLLECTION, type Client } from '../../shared/client.ts';
import { PET_COLLECTION, type Pet } from '../pet/types.ts';
import { BREED_COLLECTION, type Breed } from '../breed/types.ts';
import { normalizePhone } from '../../shared/phone.ts';
import BreedService from '../breed/service.ts';
import { AdminError } from './admin-day.ts';
import { hasConflict } from './service.ts';
import { ORDER_COLLECTION, type Order } from './types.ts';

/** Звідки прийшов запис, коли його завів адміністратор. */
export const ORDER_SOURCES = ['Телефон', 'Instagram', 'Прийшли самі'] as const;
export type OrderSource = (typeof ORDER_SOURCES)[number];

export interface ClientSearchResult {
  id: string;
  name: string;
  phone: string;
  visitsCount: number;
  pets: { id: string; name: string; breedId: string | null; breedName: string | null }[];
}

/** Екранує те, що користувач увів, щоб крапка й дужки не стали регексом. */
function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function searchClients(db: Db, query: string): Promise<ClientSearchResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const digits = q.replace(/\D/g, '');
  const rx = new RegExp(escapeRegex(q), 'i');

  const clients = await db
    .collection<Client>(CLIENT_COLLECTION)
    .find({
      $or: [
        { name: rx },
        { lastName: rx },
        ...(digits.length >= 3
          ? [{ phoneRaw: new RegExp(escapeRegex(digits)) }, { phone: new RegExp(escapeRegex(digits)) }]
          : []),
      ],
    })
    .sort({ visitsCount: -1 })
    .limit(10)
    .toArray();

  if (clients.length === 0) return [];

  const pets = await db
    .collection<Pet>(PET_COLLECTION)
    .find({ userId: { $in: clients.map((c) => c._id!) } })
    .toArray();

  const breedIds = pets.map((p) => p.breedId).filter((id): id is ObjectId => Boolean(id));
  const breeds =
    breedIds.length > 0
      ? await db
          .collection<Breed>(BREED_COLLECTION)
          .find({ _id: { $in: breedIds } })
          .toArray()
      : [];
  const breedName = new Map(breeds.map((b) => [b._id.toHexString(), b.name]));

  return clients.map((client) => ({
    id: client._id!.toHexString(),
    name: [client.name, client.lastName].filter(Boolean).join(' '),
    phone: client.phone,
    visitsCount: client.visitsCount ?? 0,
    pets: pets
      .filter((pet) => pet.userId?.equals(client._id!))
      .map((pet) => ({
        id: pet._id!.toHexString(),
        name: pet.name,
        breedId: pet.breedId ? pet.breedId.toHexString() : null,
        breedName: pet.breedId
          ? (breedName.get(pet.breedId.toHexString()) ?? null)
          : (pet.breedCustom ?? null),
      })),
  }));
}

export interface AdminOrderInput {
  clientId?: string;
  clientName?: string;
  clientPhone?: string;
  petId?: string;
  petName?: string;
  petBreedId?: string;
  groomerId: string;
  scheduledAt: string;
  durationMinutes: number;
  serviceIds?: string[];
  comment?: string;
  source: string;
}

function requireObjectId(value: string, message: string): ObjectId {
  if (!ObjectId.isValid(value)) {
    throw new AdminError(message, 400, 'bad-id');
  }
  return new ObjectId(value);
}

async function resolveClient(db: Db, input: AdminOrderInput, source: string): Promise<Client> {
  const clients = db.collection<Client>(CLIENT_COLLECTION);

  if (input.clientId) {
    const client = await clients.findOne({
      _id: requireObjectId(input.clientId, 'Клієнта не знайдено'),
    });
    if (!client) {
      throw new AdminError('Клієнта не знайдено', 404, 'no-client');
    }
    return client;
  }

  const phone = normalizePhone(input.clientPhone ?? '');
  if (!phone) {
    throw new AdminError('Телефон має бути у форматі +380XXXXXXXXX', 400, 'bad-phone');
  }
  if (!input.clientName?.trim()) {
    throw new AdminError('Вкажіть імʼя клієнта', 400, 'no-name');
  }

  // Той самий телефон міг уже бути в базі: краще доклеїти візит до картки,
  // ніж завести дубль, який потім ніхто не зведе.
  const existing = await clients.findOne({
    $or: [{ phone: phone.phone }, { phoneRaw: phone.phoneRaw }],
  });
  if (existing) return existing;

  const client: Client = {
    phone: phone.phone,
    phoneRaw: phone.phoneRaw,
    name: input.clientName.trim(),
    lastVisitAt: null,
    visitsCount: 0,
    totalSpent: 0,
    crmGroup: 'Новий',
    dateSource: source,
    isForeign: phone.isForeign,
    doNotContact: false,
    lastNotifiedAt: null,
    notifyHistory: [],
    importedAt: new Date(),
  };

  const result = await clients.insertOne(client);
  return { ...client, _id: result.insertedId };
}

async function resolvePet(db: Db, input: AdminOrderInput, clientId: ObjectId): Promise<Pet> {
  const pets = db.collection<Pet>(PET_COLLECTION);

  if (input.petId) {
    const pet = await pets.findOne({
      _id: requireObjectId(input.petId, 'Улюбленця не знайдено'),
      userId: clientId,
    });
    if (!pet) {
      throw new AdminError('Улюбленця не знайдено', 404, 'no-pet');
    }
    return pet;
  }

  const name = input.petName?.trim();
  if (!name) {
    throw new AdminError('Вкажіть кличку улюбленця', 400, 'no-pet-name');
  }

  const existing = await pets.findOne({ userId: clientId, name });
  if (existing) return existing;

  const pet: Pet = {
    name,
    age: 0,
    weight: 0,
    photoUrl: '',
    userId: clientId,
    breedId: await BreedService.resolveId(db, input.petBreedId),
    createdAt: new Date(),
    comment: '',
  };

  const result = await pets.insertOne(pet);
  return { ...pet, _id: result.insertedId };
}

/** Запис, заведений адміністратором: клієнта вже підтвердили голосом,
 *  тож він одразу йде як підтверджений, без cancelToken і без згоди з сайту. */
export async function createOrderAsAdmin(
  db: Db,
  adminId: string,
  input: AdminOrderInput
): Promise<{ id: string }> {
  const source = String(input.source ?? '').trim();
  if (!ORDER_SOURCES.includes(source as OrderSource)) {
    throw new AdminError(`Джерело має бути одним із: ${ORDER_SOURCES.join(', ')}`, 400, 'bad-source');
  }

  const scheduledAt = new Date(input.scheduledAt);
  if (Number.isNaN(scheduledAt.getTime())) {
    throw new AdminError('Некоректний час візиту', 400, 'bad-date');
  }

  const durationMinutes = Number(input.durationMinutes);
  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
    throw new AdminError('Некоректна тривалість', 400, 'bad-duration');
  }

  const groomerId = requireObjectId(input.groomerId ?? '', 'Грумера не знайдено');
  const groomer = await db
    .collection<User>(USER_COLLECTION)
    .findOne({ _id: groomerId, isGroomer: true }, { projection: { _id: 1 } });

  if (!groomer) {
    throw new AdminError('Грумера не знайдено', 404, 'no-groomer');
  }
  if (await hasConflict(db, groomerId, scheduledAt, durationMinutes)) {
    throw new AdminError('Цей час у грумера вже зайнятий', 409, 'slot-taken');
  }

  const client = await resolveClient(db, input, source);
  const pet = await resolvePet(db, input, client._id!);

  const serviceIds = (input.serviceIds ?? []).map((id) =>
    requireObjectId(id, 'Некоректна послуга')
  );

  const now = new Date();
  const admin = new ObjectId(adminId);
  const order: Order = {
    clientId: client._id!,
    petId: pet._id!,
    groomerId,
    createdAt: now,
    scheduledAt,
    durationMinutes,
    status: 'pending',
    statusHistory: [{ status: 'pending', changedAt: now, changedBy: admin, note: source }],
    comment: input.comment?.trim() ?? '',
    serviceIds,
    source,
    confirmedAt: now,
    confirmedBy: admin,
  };

  const result = await db.collection<Order>(ORDER_COLLECTION).insertOne(order);
  return { id: result.insertedId.toHexString() };
}
