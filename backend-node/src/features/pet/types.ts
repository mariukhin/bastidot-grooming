import type { ObjectId } from 'mongodb';

export const PET_COLLECTION = 'pet';

// Дзеркало domain/pet.go. Два ObjectId-поля: власний _id та userId
// (foreign key на колекцію user). createdAt ставить сервер, не клієнт.
export interface Pet {
  _id?: ObjectId;
  name: string;
  age: number;
  weight: number;
  photoUrl: string;
  userId: ObjectId;
  createdAt: Date;
  comment: string;
}

// Дані, які приймаємо від клієнта при створенні. Свідомо НЕ містить
// _id (генерує Mongo) і createdAt (ставить сервер) — клієнту тут не місце.
export interface CreatePetInput {
  name: string;
  age: number;
  weight: number;
  photoUrl?: string;
  userId: string;
  comment?: string;
}
