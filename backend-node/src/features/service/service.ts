import type { Db } from 'mongodb';
import { ObjectId } from 'mongodb';
import { SERVICE_COLLECTION, type Service } from './types.ts';

async function getByBreedId(db: Db, breedId: string): Promise<Service[]> {
  const collection = db.collection<Service>(SERVICE_COLLECTION);

  return await collection.find({ breedId: new ObjectId(breedId) }).sort({ defaultPrice: 1 }).toArray();
}

const ServiceService = {
  getByBreedId: getByBreedId
}

export default ServiceService;
