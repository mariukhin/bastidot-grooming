import type { Db } from 'mongodb';
import type { ObjectId } from 'mongodb';

import { logger } from '../../shared/logger.ts';

export const PET_TRAIT_COLLECTION = 'pet_trait';

export interface PetTrait {
  _id?: ObjectId;
  key: string;
  label: string;
  minLabel: string;
  maxLabel: string;
  order: number;
  isActive: boolean;
}

const SEED: Omit<PetTrait, '_id'>[] = [
  {
    key: 'fear_dryer',
    label: 'Боїться фену',
    minLabel: 'Спокійний',
    maxLabel: 'Панікує',
    order: 1,
    isActive: true,
  },
  {
    key: 'fear_scissors',
    label: 'Боїться ножиць',
    minLabel: 'Спокійний',
    maxLabel: 'Панікує',
    order: 2,
    isActive: true,
  },
  {
    key: 'fear_bath',
    label: 'Боїться купання',
    minLabel: 'Спокійний',
    maxLabel: 'Панікує',
    order: 3,
    isActive: true,
  },
];

export async function ensurePetTraits(db: Db): Promise<void> {
  const collection = db.collection<PetTrait>(PET_TRAIT_COLLECTION);

  await collection.createIndex({ key: 1 }, { unique: true });

  const result = await collection.bulkWrite(
    SEED.map((trait) => ({
      updateOne: { filter: { key: trait.key }, update: { $setOnInsert: trait }, upsert: true },
    }))
  );

  if (result.upsertedCount > 0) {
    logger.info('Додано шкали характеру', { count: result.upsertedCount });
  }
}

export async function fetchActiveTraits(db: Db): Promise<PetTrait[]> {
  return await db
    .collection<PetTrait>(PET_TRAIT_COLLECTION)
    .find({ isActive: true })
    .sort({ order: 1 })
    .toArray();
}

export function toTraitDTO(trait: PetTrait) {
  return {
    key: trait.key,
    label: trait.label,
    minLabel: trait.minLabel,
    maxLabel: trait.maxLabel,
    order: trait.order,
  };
}
