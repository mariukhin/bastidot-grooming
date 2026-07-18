import type { ObjectId } from 'mongodb';

export const ORDER_COLLECTION = 'order';

// Статуси як union-тип рядків замість enum — erasableSyntaxOnly забороняє
// enum (він не стирається), тож це ідіоматична заміна.
export type OrderStatus = 'pending' | 'completed' | 'cancelled' | 'no_show';

// Один перехід статусу. Уся історія зберігається, а не перезаписується —
// щоб було видно хто/коли/на що змінив.
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
  // Захоплюється в момент бронювання з тривалості обраних послуг, щоб
  // пізніша зміна послуги не зсувала вже заброньований слот.
  durationMinutes: number;
  status: OrderStatus;
  statusHistory: OrderStatusChange[];
  comment: string;
  serviceIds: ObjectId[];
}

// Публічна форма зайнятого інтервалу — фронтенд виключає з пікера
// слоти, що перетинаються з уже заброньованими.
export interface BusySlot {
  scheduledAt: Date;
  durationMinutes: number;
}

// Payload створення. Клієнт і тваринка резолвляться (find-or-create) за
// сирими даними — сам ID не передається. Грумер має вже існувати.
export interface CreateOrderInput {
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  petName: string;
  petAge?: number;
  petWeight?: number;
  petPhotoUrl?: string;
  petComment?: string;
  groomerId: string;
  scheduledAt: string; // ISO-рядок, парситься в Date
  durationMinutes: number;
  comment?: string;
  serviceIds?: string[];
}
