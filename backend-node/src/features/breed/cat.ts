import { ObjectId } from 'mongodb';
import type { Db } from 'mongodb';

import { config } from '../../shared/config.ts';
import { logger } from '../../shared/logger.ts';
import { BREED_COLLECTION, type Breed } from './types.ts';

export const CAT_BREED_NAME = 'Кіт';

let cached: ObjectId | null | undefined;

export async function getCatBreedId(db: Db): Promise<ObjectId | null> {
  if (cached !== undefined) {
    return cached;
  }

  if (config.catBreedId && ObjectId.isValid(config.catBreedId)) {
    cached = new ObjectId(config.catBreedId);
    return cached;
  }

  const breed = await db
    .collection<Breed>(BREED_COLLECTION)
    .findOne({ name: CAT_BREED_NAME }, { projection: { _id: 1 } });

  cached = breed?._id ?? null;

  if (!cached) {
    logger.warn('Породу «Кіт» не знайдено — species завжди буде dog', {
      hint: 'додайте породу або задайте CAT_BREED_ID',
    });
  }

  return cached;
}

export function resetCatBreedCache(): void {
  cached = undefined;
}

export async function resolveSpecies(
  db: Db,
  breedId: ObjectId | null | undefined
): Promise<'dog' | 'cat'> {
  if (!breedId) return 'dog';

  const catId = await getCatBreedId(db);
  return catId && breedId.equals(catId) ? 'cat' : 'dog';
}
