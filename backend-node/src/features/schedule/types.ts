import type { ObjectId } from 'mongodb';

export const SCHEDULE_COLLECTION = 'groomer_schedule';

/** Інтервал у локальному часі салону, «HH:mm». */
export interface TimeRange {
  from: string;
  to: string;
}

export interface WeeklyRule extends TimeRange {
  /** 0 — неділя, 6 — субота, як у Date.getDay(). */
  weekday: number;
}

export interface ScheduleException extends Partial<TimeRange> {
  /** YYYY-MM-DD у часовій зоні салону. */
  date: string;
  dayOff?: boolean;
}

export interface GroomerSchedule {
  _id?: ObjectId;
  groomerId: ObjectId;
  weekly: WeeklyRule[];
  exceptions: ScheduleException[];
  updatedAt: Date;
}

export const DEFAULT_DAY: TimeRange = { from: '09:00', to: '20:00' };

export class ScheduleError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(message: string, status: number, code: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}
