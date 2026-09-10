import type { ObjectId } from 'mongodb';

export const CLIENT_COLLECTION = 'client';

export interface NotifyHistoryEntry {
  sentAt: Date;
  lastVisitAt: Date | null;
  group: 'warm' | 'cold' | 'no-answer';
}

export interface CallEntry {
  calledAt: Date;
  channel: string;
  result?: string;
  reason?: string;
  comment?: string;
  bookedFor?: Date;
}

export interface Client {
  _id?: ObjectId;
  phone: string;
  phoneRaw: string;
  name: string;
  lastName?: string;
  email?: string;
  lastVisitAt: Date | null;
  firstVisitAt?: Date;
  visitsCount: number;
  totalSpent: number;
  crmGroup: string;
  dateSource: string;
  services?: string;
  clientSince?: Date;
  isForeign: boolean;
  doNotContact: boolean;
  lastNotifiedAt: Date | null;
  notifyHistory: NotifyHistoryEntry[];
  calls?: CallEntry[];
  remindAfter?: Date | null;
  importedAt: Date;
  whatsapp?: string;
  instagram?: string;
  _importNote?: string;
  note?: string;
  tags?: string;
}
