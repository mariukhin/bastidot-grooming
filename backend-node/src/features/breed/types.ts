import type { ObjectId } from 'mongodb';

export const BREED_COLLECTION = 'breed';

export interface Breed {
  _id?: ObjectId;
  name: string;
}