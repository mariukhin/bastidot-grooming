import type { ObjectId } from 'mongodb';

export interface LapsedClient {
  clientId: ObjectId;
  name: string;
  phone: string;
  crmGroup: string;
  visitsCount: number;
  dateSource: string;
  lastVisitAt: Date;
  petName: string | null;
  petAge: number | null;
  petBreed: string | null;
}

export interface LapsedClientGroups {
  warm: LapsedClient[];
  cold: LapsedClient[];
}

export interface FindLapsedOptions {
  inactiveDays: number;
  cooldownDays: number;
  batchSize: number;
}
