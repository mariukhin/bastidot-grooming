import type { Db } from 'mongodb';
import { ObjectId } from 'mongodb';
import { BREED_COLLECTION, type Breed } from './types.ts';
import { CAT_BREED_NAME } from './cat.ts';

async function fetchAll(db: Db): Promise<Breed[]> {
  const collection = db.collection<Breed>(BREED_COLLECTION);
  return await collection.find().toArray();
}

async function getById(db: Db, id: string): Promise<Breed | null> {
  const collection = db.collection<Breed>(BREED_COLLECTION);
  return await collection.findOne({ _id: new ObjectId(id) });
}

async function create(db: Db, name: string): Promise<Breed | null> {
  const collection = db.collection<Breed>(BREED_COLLECTION);

  const isExisting = await collection.findOne({ name });
  if (isExisting) {
    return null;
  }

  // insertOne повертає лише { acknowledged, insertedId } — не документ.
  // Тому справжній Breed збираємо самі з нового id та імені.
  const result = await collection.insertOne({ name });
  return { _id: result.insertedId, name };
}

async function resolveId(db: Db, id: string | null | undefined): Promise<ObjectId | null> {
  if (!id) {
    return null;
  }
  if (!ObjectId.isValid(id)) {
    throw new Error(`invalid breedId: ${id}`);
  }

  const _id = new ObjectId(id);
  const exists = await db
    .collection<Breed>(BREED_COLLECTION)
    .countDocuments({ _id }, { limit: 1 });

  if (exists === 0) {
    throw new Error(`breed not found: ${id}`);
  }
  return _id;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function search(db: Db, query: string): Promise<Breed[]> {
  const found = await db
    .collection<Breed>(BREED_COLLECTION)
    .find({ name: { $regex: escapeRegex(query), $options: 'i' } })
    .sort({ name: 1 })
    .toArray();
  return found.sort(
    (a, b) => Number(b.name === CAT_BREED_NAME) - Number(a.name === CAT_BREED_NAME)
  );
}

const BreedService = {
  fetchAll: fetchAll,
  getById: getById,
  create: create,
  resolveId: resolveId,
  search: search,
}

export default BreedService;
