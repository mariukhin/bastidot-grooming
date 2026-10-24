import type { ObjectId } from 'mongodb';

export const PET_COLLECTION = 'pet';

export interface PetTraitValue {
  traitKey: string;
  value: number;
}

export interface Pet {
  _id?: ObjectId;
  name: string;
  breedId?: ObjectId | null;
  breedCustom?: string | null;
  weight: number;
  birthDate?: Date | null;
  photoUrl: string;
  photoPreviewUrl?: string;
  wishes?: string;
  traits?: PetTraitValue[];
  archivedAt?: Date | null;
  userId: ObjectId;
  createdAt: Date;
  age?: number;
  comment?: string;
}

export interface CreatePetInput {
  name: string;
  age?: number;
  weight: number;
  photoUrl?: string;
  userId: string;
  breedId?: string;
  comment?: string;
}
