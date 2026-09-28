import type { ObjectId } from 'mongodb';

export const ORDER_COLLECTION = 'order';

export type OrderStatus = 'pending' | 'completed' | 'cancelled' | 'no_show';

export interface OrderStatusChange {
  status: OrderStatus;
  changedAt: Date;
  changedBy?: ObjectId;
  note?: string;
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
  // Секрет, виданий тому, хто створив запис. Замість логіна: дозволяє змінити
  // саме своє замовлення, не даючи перебрати чужі за _id.
  cancelToken?: string;
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

export interface RescheduleOrderInput {
  scheduledAt: string;
  durationMinutes?: number;
}

/** Коди, які контролер мапить на HTTP-статуси. */
export type OrderActionError =
  | 'not-found'
  | 'forbidden'
  | 'already-cancelled'
  | 'too-late'
  | 'slot-taken';

export class OrderActionFailure extends Error {
  readonly code: OrderActionError;

  constructor(code: OrderActionError) {
    super(code);
    this.code = code;
  }
}
