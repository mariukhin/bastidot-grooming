import type { ObjectId } from 'mongodb';

export const SERVICE_COLLECTION = 'service';

export interface Service {
  _id?: ObjectId;
  breedId: ObjectId;
  type: string;
  defaultPrice: number;
  vipPrice: number | null;
  durationHour: number;
  durationMin: number;
}