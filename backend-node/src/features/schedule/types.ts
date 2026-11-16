import type { ObjectId } from 'mongodb';

export const SCHEDULE_COLLECTION = 'groomer_schedule';
/** Журнал змін графіка: хто, коли і що поміняв. */
export const SCHEDULE_CHANGE_COLLECTION = 'groomer_schedule_change';

/** Інтервал у локальному часі салону, «HH:mm». */
export interface TimeRange {
  from: string;
  to: string;
}

export interface WeeklyRule extends TimeRange {
  /** 0 — неділя, 6 — субота, як у Date.getDay(). */
  weekday: number;
}

export const EXCEPTION_TYPES = ['vacation', 'sick', 'day_off', 'custom_hours'] as const;
export type ExceptionType = (typeof EXCEPTION_TYPES)[number];

export const EXCEPTION_LABEL: Record<ExceptionType, string> = {
  vacation: 'Відпустка',
  sick: 'Лікарняний',
  day_off: 'Вихідний',
  custom_hours: 'Інші години',
};

/** Найдовший виняток: довша відсутність — це вже не виняток, а зміна шаблону. */
export const MAX_EXCEPTION_DAYS = 366;

/**
 * Виняток із шаблону на діапазон дат (обидві межі включно, YYYY-MM-DD у
 * часовій зоні салону). Для custom_hours from/to — години роботи в кожен із
 * цих днів; решта типів означає, що грумер не працює зовсім.
 */
export interface ScheduleException extends Partial<TimeRange> {
  id: string;
  type: ExceptionType;
  dateFrom: string;
  dateTo: string;
  note?: string;
  changedBy?: ObjectId;
  changedAt?: Date;
}

/** Як винятки лежали до SCRUM-58: одна дата, вихідний або інші години. */
export interface LegacyScheduleException extends Partial<TimeRange> {
  date: string;
  dayOff?: boolean;
}

/**
 * Новий тижневий шаблон, що набуде чинності з effectiveFrom (понеділок).
 * Зміна шаблону не зсуває вже прийняті записи цього тижня: до effectiveFrom
 * діє weekly, з нього — pendingWeekly.weekly.
 */
export interface PendingWeekly {
  effectiveFrom: string;
  weekly: WeeklyRule[];
  changedBy?: ObjectId;
  changedAt?: Date;
}

export interface GroomerSchedule {
  _id?: ObjectId;
  groomerId: ObjectId;
  weekly: WeeklyRule[];
  pendingWeekly?: PendingWeekly | null;
  exceptions: (ScheduleException | LegacyScheduleException)[];
  updatedAt: Date;
  updatedBy?: ObjectId;
}

export type ScheduleChangeAction = 'weekly' | 'exception-add' | 'exception-remove' | 'online-booking';

export interface ScheduleChange {
  _id?: ObjectId;
  groomerId: ObjectId;
  changedBy: ObjectId;
  changedByRole: 'admin' | 'groomer';
  changedAt: Date;
  action: ScheduleChangeAction;
  /** Що саме змінилось: новий шаблон, доданий/прибраний виняток, прапорець. */
  details: Record<string, unknown>;
  /** Скільки вже існуючих записів опинилось поза робочим часом. */
  affectedOrders: number;
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
