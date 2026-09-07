import type { ObjectId } from 'mongodb';

export const CLIENT_COLLECTION = 'client';

export interface NotifyHistoryEntry {
  sentAt: Date;
  lastVisitAt: Date | null;
  group: 'warm' | 'cold';
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
  importedAt: Date;
  whatsapp?: string;
  instagram?: string;
  _importNote?: string;
  note?: string;
  tags?: string;
}
