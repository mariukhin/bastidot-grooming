import { ObjectId } from 'mongodb';
import type { Db } from 'mongodb';

import { USER_COLLECTION, type User } from '../../shared/user.ts';
import AuthService, { PhoneNotVerifiedError } from '../auth/service.ts';
import { BREED_COLLECTION, type Breed } from '../breed/types.ts';
import { resolveSpecies } from '../breed/cat.ts';
import { PET_COLLECTION, type Pet, type PetTraitValue } from './types.ts';
import { fetchActiveTraits } from './traits.ts';

export type PetField = 'name' | 'breedId' | 'breedCustom' | 'weight' | 'birthDate' | 'traits';

export class PetError extends Error {
  readonly status: number;
  readonly field?: PetField;

  constructor(message: string, status: number, field?: PetField) {
    super(message);
    this.status = status;
    this.field = field;
  }
}

export interface PetInput {
  name: string;
  breedId: ObjectId | null;
  breedCustom: string | null;
  weight: number;
  birthDate: Date | null;
  photoUrl: string | null;
  wishes: string;
  traits: PetTraitValue[];
}

const NAME_MAX = 40;
const WISHES_MAX = 1000;
const WEIGHT_MIN = 0.1;
const WEIGHT_MAX = 100;

function isValidWeightStep(weight: number): boolean {
  return Math.abs(weight * 10 - Math.round(weight * 10)) < 1e-9;
}

export async function parsePetInput(
  db: Db,
  body: unknown,
  { partial }: { partial: boolean }
): Promise<Partial<PetInput>> {
  if (typeof body !== 'object' || body === null) {
    throw new PetError('Некоректний запит', 400);
  }

  const b = body as Record<string, unknown>;
  const out: Partial<PetInput> = {};

  if (!partial || b.name !== undefined) {
    const name = typeof b.name === 'string' ? b.name.trim() : '';
    if (name === '' || name.length > NAME_MAX) {
      throw new PetError(`Кличка обовʼязкова, до ${NAME_MAX} символів`, 400, 'name');
    }
    out.name = name;
  }

  const hasBreedId = typeof b.breedId === 'string' && b.breedId !== '';
  const hasCustom = typeof b.breedCustom === 'string' && b.breedCustom.trim() !== '';

  if (!partial || b.breedId !== undefined || b.breedCustom !== undefined) {
    if (hasBreedId && hasCustom) {
      throw new PetError('Оберіть породу зі списку або впишіть свою', 400, 'breedId');
    }
    if (!hasBreedId && !hasCustom && !partial) {
      throw new PetError('Порода обовʼязкова', 400, 'breedId');
    }

    if (hasBreedId) {
      if (!ObjectId.isValid(b.breedId as string)) {
        throw new PetError('Невідома порода', 400, 'breedId');
      }
      const _id = new ObjectId(b.breedId as string);
      const breed = await db.collection<Breed>(BREED_COLLECTION).findOne({ _id });
      if (!breed) {
        throw new PetError('Невідома порода', 400, 'breedId');
      }
      out.breedId = _id;
      out.breedCustom = null;
    } else if (hasCustom) {
      const custom = (b.breedCustom as string).trim();
      if (custom.length > NAME_MAX) {
        throw new PetError(`Назва породи — до ${NAME_MAX} символів`, 400, 'breedCustom');
      }
      out.breedCustom = custom;
      out.breedId = null;
    }
  }

  if (!partial || b.weight !== undefined) {
    const weight = typeof b.weight === 'number' ? b.weight : NaN;
    if (!Number.isFinite(weight) || weight < WEIGHT_MIN || weight > WEIGHT_MAX) {
      throw new PetError(`Вага від ${WEIGHT_MIN} до ${WEIGHT_MAX} кг`, 400, 'weight');
    }
    if (!isValidWeightStep(weight)) {
      throw new PetError('Вага вказується з точністю до 0.1 кг', 400, 'weight');
    }
    out.weight = Math.round(weight * 10) / 10;
  }

  if (b.birthDate !== undefined) {
    if (b.birthDate === null || b.birthDate === '') {
      out.birthDate = null;
    } else {
      const date = new Date(String(b.birthDate));
      if (Number.isNaN(date.getTime())) {
        throw new PetError('Невірна дата народження', 400, 'birthDate');
      }
      if (date.getTime() > Date.now()) {
        throw new PetError('Дата народження не може бути в майбутньому', 400, 'birthDate');
      }
      out.birthDate = date;
    }
  }

  if (b.photoUrl !== undefined) {
    out.photoUrl = typeof b.photoUrl === 'string' && b.photoUrl !== '' ? b.photoUrl : null;
  }

  if (b.wishes !== undefined) {
    const wishes = typeof b.wishes === 'string' ? b.wishes.trim() : '';
    if (wishes.length > WISHES_MAX) {
      throw new PetError(`Побажання — до ${WISHES_MAX} символів`, 400);
    }
    out.wishes = wishes;
  }

  if (b.traits !== undefined) {
    out.traits = await parseTraits(db, b.traits);
  }

  return out;
}

async function parseTraits(db: Db, raw: unknown): Promise<PetTraitValue[]> {
  if (!Array.isArray(raw)) {
    throw new PetError('Характеристики мають бути списком', 400, 'traits');
  }

  const active = new Set((await fetchActiveTraits(db)).map((trait) => trait.key));
  const seen = new Set<string>();
  const result: PetTraitValue[] = [];

  for (const item of raw) {
    if (typeof item !== 'object' || item === null) {
      throw new PetError('Некоректна характеристика', 400, 'traits');
    }
    const { traitKey, value } = item as Record<string, unknown>;

    if (typeof traitKey !== 'string' || !active.has(traitKey)) {
      throw new PetError('Невідома характеристика', 400, 'traits');
    }
    if (seen.has(traitKey)) {
      throw new PetError('Характеристика вказана двічі', 400, 'traits');
    }
    if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > 10) {
      throw new PetError('Значення характеристики — ціле від 1 до 10', 400, 'traits');
    }

    seen.add(traitKey);
    result.push({ traitKey, value });
  }

  return result;
}

/** Картка клієнта для читання: якщо її ще немає — показувати просто нічого. */
export async function findClientId(db: Db, userId: string): Promise<ObjectId | null> {
  if (!ObjectId.isValid(userId)) {
    throw new PetError('Користувача не знайдено', 404);
  }

  const user = await db
    .collection<User>(USER_COLLECTION)
    .findOne({ _id: new ObjectId(userId) }, { projection: { clientId: 1 } });

  return user?.clientId ?? null;
}

/**
 * Картка клієнта для запису — створюється за потреби.
 *
 * Чекати на перший запис не можна: додати улюбленця в кабінеті має бути
 * можливо одразу після реєстрації.
 */
export async function requireClientId(db: Db, userId: string): Promise<ObjectId> {
  if (!ObjectId.isValid(userId)) {
    throw new PetError('Користувача не знайдено', 404);
  }

  try {
    return await AuthService.ensureClientId(db, new ObjectId(userId));
  } catch (err) {
    if (err instanceof PhoneNotVerifiedError) {
      throw new PetError('Підтвердіть номер телефону — і зможете додати улюбленця', 403);
    }
    throw new PetError('Не вдалося створити картку клієнта', 500);
  }
}

/** Шукає улюбленця строго в межах своєї картки: чужий id дасть 404, а не 403. */
async function findOwnPet(db: Db, clientId: ObjectId, petId: string): Promise<Pet> {
  if (!ObjectId.isValid(petId)) {
    throw new PetError('Улюбленця не знайдено', 404);
  }

  const pet = await db
    .collection<Pet>(PET_COLLECTION)
    .findOne({ _id: new ObjectId(petId), userId: clientId });

  if (!pet || pet.archivedAt) {
    throw new PetError('Улюбленця не знайдено', 404);
  }

  return pet;
}

export async function listPets(db: Db, clientId: ObjectId): Promise<Pet[]> {
  return await db
    .collection<Pet>(PET_COLLECTION)
    .find({ userId: clientId, archivedAt: { $in: [null, undefined] } })
    .sort({ createdAt: 1 })
    .toArray();
}

export async function createPet(
  db: Db,
  clientId: ObjectId,
  input: Partial<PetInput>
): Promise<Pet> {
  const pet: Pet = {
    name: input.name!,
    breedId: input.breedId ?? null,
    breedCustom: input.breedCustom ?? null,
    weight: input.weight!,
    birthDate: input.birthDate ?? null,
    photoUrl: input.photoUrl ?? '',
    wishes: input.wishes ?? '',
    traits: input.traits ?? [],
    archivedAt: null,
    userId: clientId,
    createdAt: new Date(),
  };

  const { insertedId } = await db.collection<Pet>(PET_COLLECTION).insertOne(pet);
  return { ...pet, _id: insertedId };
}

export async function updatePet(
  db: Db,
  clientId: ObjectId,
  petId: string,
  input: Partial<PetInput>
): Promise<Pet> {
  const pet = await findOwnPet(db, clientId, petId);

  const patch: Partial<Pet> = {};
  if (input.name !== undefined) patch.name = input.name;
  if (input.breedId !== undefined) patch.breedId = input.breedId;
  if (input.breedCustom !== undefined) patch.breedCustom = input.breedCustom;
  if (input.weight !== undefined) patch.weight = input.weight;
  if (input.birthDate !== undefined) patch.birthDate = input.birthDate;
  if (input.photoUrl !== undefined) patch.photoUrl = input.photoUrl ?? '';
  if (input.wishes !== undefined) patch.wishes = input.wishes;
  if (input.traits !== undefined) patch.traits = input.traits;

  // Старі картки з booking не мають ваги. Перше ж редагування має її вимагати,
  // інакше в базі назавжди лишиться weight: 0.
  const nextWeight = patch.weight ?? pet.weight;
  if (!nextWeight || nextWeight < WEIGHT_MIN) {
    throw new PetError('Вкажіть вагу улюбленця', 400, 'weight');
  }

  if (Object.keys(patch).length > 0) {
    await db.collection<Pet>(PET_COLLECTION).updateOne({ _id: pet._id! }, { $set: patch });
  }

  return { ...pet, ...patch };
}

/** Soft delete: історія візитів посилається на petId, тож запис лишається. */
export async function archivePet(db: Db, clientId: ObjectId, petId: string): Promise<void> {
  const pet = await findOwnPet(db, clientId, petId);

  await db
    .collection<Pet>(PET_COLLECTION)
    .updateOne({ _id: pet._id! }, { $set: { archivedAt: new Date() } });
}

export async function toAccountPetDTO(db: Db, pet: Pet) {
  const breed = pet.breedId
    ? await db.collection<Breed>(BREED_COLLECTION).findOne({ _id: pet.breedId })
    : null;

  return {
    id: pet._id!.toHexString(),
    name: pet.name,
    breedId: pet.breedId ? pet.breedId.toHexString() : null,
    breedName: breed?.name ?? null,
    breedCustom: pet.breedCustom ?? null,
    // Обчислюється, у базі не зберігається — потрібне лише для плейсхолдера фото.
    species: await resolveSpecies(db, pet.breedId),
    weight: pet.weight,
    birthDate: pet.birthDate ? pet.birthDate.toISOString() : null,
    photoUrl: pet.photoUrl || null,
    photoPreviewUrl: pet.photoPreviewUrl || pet.photoUrl || null,
    wishes: pet.wishes ?? pet.comment ?? '',
    traits: pet.traits ?? [],
    createdAt: pet.createdAt.toISOString(),
  };
}
