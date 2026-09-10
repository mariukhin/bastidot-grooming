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
  lastCallAt: Date | null;
  attempts: number;
}

export interface LapsedClientGroups {
  warm: LapsedClient[];
  cold: LapsedClient[];
  noAnswer: LapsedClient[];
}

export interface FindLapsedOptions {
  inactiveDays: number;
  cooldownDays: number;
  warmSize: number;
  coldSize: number;
  noAnswerSize: number;
}
