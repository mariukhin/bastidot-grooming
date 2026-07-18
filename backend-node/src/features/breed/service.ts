import type { Db } from 'mongodb';
import { ObjectId } from 'mongodb';
import { BREED_COLLECTION, type Breed } from './types.ts';

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

const BreedService = {
  fetchAll: fetchAll,
  getById: getById,
  create: create
}

export default BreedService;
