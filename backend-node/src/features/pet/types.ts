import type { ObjectId } from 'mongodb';

export const PET_COLLECTION = 'pet';

export interface Pet {
  _id?: ObjectId;
  name: string;
  age: number;
  weight: number;
  photoUrl: string;
  userId: ObjectId;
  breedId?: ObjectId | null;
  createdAt: Date;
  comment: string;
}

export interface CreatePetInput {
  name: string;
  age: number;
  weight: number;
  photoUrl?: string;
  userId: string;
  breedId?: string;
  comment?: string;
}
