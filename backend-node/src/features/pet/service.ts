import type { Db } from 'mongodb';
import { ObjectId } from 'mongodb';
import { PET_COLLECTION, type Pet, type CreatePetInput } from './types.ts';

async function create(db: Db, input: CreatePetInput): Promise<Pet> {
  const collection = db.collection<Pet>(PET_COLLECTION);

  const pet: Pet = {
    name: input.name,
    age: input.age,
    weight: input.weight,
    photoUrl: input.photoUrl ?? '',
    userId: new ObjectId(input.userId),
    createdAt: new Date(),
    comment: input.comment ?? '',
  };

  const result = await collection.insertOne(pet);
  return { ...pet, _id: result.insertedId };
}

async function fetchByUserId(db: Db, userId: string): Promise<Pet[]> {
  const collection = db.collection<Pet>(PET_COLLECTION);
  return await collection.find({ userId: new ObjectId(userId) }).toArray();
}

async function getById(db: Db, id: string): Promise<Pet | null> {
  const collection = db.collection<Pet>(PET_COLLECTION);
  return await collection.findOne({ _id: new ObjectId(id) });
}

const PetService = {
  create,
  fetchByUserId,
  getById,
};

export default PetService;
