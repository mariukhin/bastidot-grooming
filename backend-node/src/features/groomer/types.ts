import type { ObjectId } from 'mongodb';

export const USER_COLLECTION  = 'user';

export interface User {
  _id?: ObjectId;
  username: string;
  email: string;
  phoneNumber: string;
  photoUrl: string;
  password: string;
  isAdmin: boolean;
  isGroomer: boolean;
  isVip: boolean;
  createdAt: Date;
}