import type { ObjectId } from 'mongodb';

export const ORDER_COLLECTION = 'order';

export type OrderStatus = 'pending' | 'completed' | 'cancelled' | 'no_show';

export interface OrderStatusChange {
  status: OrderStatus;
  changedAt: Date;
  changedBy?: ObjectId;
}

export interface Order {
  _id?: ObjectId;
  clientId: ObjectId;
  petId: ObjectId;
  groomerId: ObjectId;
  createdAt: Date;
  scheduledAt: Date;
  durationMinutes: number;
  status: OrderStatus;
  statusHistory: OrderStatusChange[];
  comment: string;
  serviceIds: ObjectId[];
}

export interface BusySlot {
  scheduledAt: Date;
  durationMinutes: number;
}

export interface CreateOrderInput {
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  petName: string;
  petAge?: number;
  petWeight?: number;
  petPhotoUrl?: string;
  petComment?: string;
  petBreedId?: string;
  groomerId: string;
  scheduledAt: string;
  durationMinutes: number;
  comment?: string;
  serviceIds?: string[];
}
