import { ObjectId } from 'mongodb';
import type { Db } from 'mongodb';

import { USER_COLLECTION, type User } from '../../shared/user.ts';
import {
  DEFAULT_DAY,
  SCHEDULE_COLLECTION,
  ScheduleError,
  type GroomerSchedule,
  type ScheduleException,
  type TimeRange,
  type WeeklyRule,
} from './types.ts';
import { datesBetween, isDateString, isTimeString, minutesOf, weekdayInZone, zonedToUtc } from './time.ts';

export interface DaySchedule {
  groomerId: string;
  name: string;
  intervals: TimeRange[];
  /** Звідки взявся день: шаблон, виняток на дату чи усталені години. */
  source: 'weekly' | 'exception' | 'default';
}

function sortRanges(ranges: TimeRange[]): TimeRange[] {
  return [...ranges].sort((a, b) => minutesOf(a.from) - minutesOf(b.from));
}

function parseRange(value: unknown, where: string): TimeRange {
  const r = (value ?? {}) as Record<string, unknown>;

  if (!isTimeString(r.from) || !isTimeString(r.to)) {
    throw new ScheduleError(`${where}: час має бути у форматі HH:mm`, 400, 'bad-time');
  }
  if (minutesOf(r.from) >= minutesOf(r.to)) {
    throw new ScheduleError(`${where}: початок має бути раніше за кінець`, 400, 'bad-range');
  }

  return { from: r.from, to: r.to };
}

export function parseWeekly(value: unknown): WeeklyRule[] {
  if (!Array.isArray(value)) {
    throw new ScheduleError('weekly має бути масивом', 400, 'bad-weekly');
  }

  const rules = value.map((item, i) => {
    const row = (item ?? {}) as Record<string, unknown>;
    const weekday = Number(row.weekday);

    if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) {
      throw new ScheduleError(`weekly[${i}]: weekday від 0 до 6`, 400, 'bad-weekday');
    }

    return { weekday, ...parseRange(row, `weekly[${i}]`) };
  });

  // Інтервали одного дня не мають накладатись — інакше незрозуміло, скільки
  // насправді працює грумер, і завантаженість порахується неправильно.
  for (let day = 0; day <= 6; day++) {
    const ofDay = sortRanges(rules.filter((r) => r.weekday === day));
    for (let i = 1; i < ofDay.length; i++) {
      if (minutesOf(ofDay[i]!.from) < minutesOf(ofDay[i - 1]!.to)) {
        throw new ScheduleError(`Інтервали дня ${day} перетинаються`, 400, 'overlap');
      }
    }
  }

  return rules;
}

export function parseException(date: string, body: unknown): ScheduleException {
  if (!isDateString(date)) {
    throw new ScheduleError('Дата має бути YYYY-MM-DD', 400, 'bad-date');
  }

  const b = (body ?? {}) as Record<string, unknown>;
  if (b.dayOff === true) {
    return { date, dayOff: true };
  }

  return { date, ...parseRange(b, 'виняток') };
}

async function listGroomers(db: Db): Promise<User[]> {
  return await db
    .collection<User>(USER_COLLECTION)
    .find({ isGroomer: true }, { projection: { username: 1, isGroomer: 1 } })
    .toArray();
}

export async function getSchedule(db: Db, groomerId: string): Promise<GroomerSchedule> {
  if (!ObjectId.isValid(groomerId)) {
    throw new ScheduleError('Грумера не знайдено', 404, 'no-groomer');
  }

  const _id = new ObjectId(groomerId);
  const groomer = await db.collection<User>(USER_COLLECTION).findOne({ _id, isGroomer: true });
  if (!groomer) {
    throw new ScheduleError('Грумера не знайдено', 404, 'no-groomer');
  }

  const doc = await db.collection<GroomerSchedule>(SCHEDULE_COLLECTION).findOne({ groomerId: _id });
  return doc ?? { groomerId: _id, weekly: [], exceptions: [], updatedAt: new Date(0) };
}

export async function saveWeekly(db: Db, groomerId: string, weekly: WeeklyRule[]): Promise<void> {
  const current = await getSchedule(db, groomerId);

  await db.collection<GroomerSchedule>(SCHEDULE_COLLECTION).updateOne(
    { groomerId: current.groomerId },
    {
      $set: { weekly, updatedAt: new Date() },
      $setOnInsert: { groomerId: current.groomerId, exceptions: [] },
    },
    { upsert: true }
  );
}

export async function saveException(
  db: Db,
  groomerId: string,
  exception: ScheduleException
): Promise<void> {
  const current = await getSchedule(db, groomerId);
  const rest = current.exceptions.filter((e) => e.date !== exception.date);

  await db.collection<GroomerSchedule>(SCHEDULE_COLLECTION).updateOne(
    { groomerId: current.groomerId },
    {
      $set: { exceptions: [...rest, exception], updatedAt: new Date() },
      $setOnInsert: { groomerId: current.groomerId, weekly: [] },
    },
    { upsert: true }
  );
}

export async function removeException(db: Db, groomerId: string, date: string): Promise<boolean> {
  const current = await getSchedule(db, groomerId);
  const rest = current.exceptions.filter((e) => e.date !== date);

  if (rest.length === current.exceptions.length) return false;

  await db
    .collection<GroomerSchedule>(SCHEDULE_COLLECTION)
    .updateOne(
      { groomerId: current.groomerId },
      { $set: { exceptions: rest, updatedAt: new Date() } }
    );

  return true;
}

/** Робочі інтервали одного дня: виняток важливіший за шаблон. */
export function intervalsFor(
  schedule: Pick<GroomerSchedule, 'weekly' | 'exceptions'>,
  date: string
): { intervals: TimeRange[]; source: DaySchedule['source'] } {
  const exception = schedule.exceptions.find((e) => e.date === date);

  if (exception) {
    if (exception.dayOff || !exception.from || !exception.to) {
      return { intervals: [], source: 'exception' };
    }
    return { intervals: [{ from: exception.from, to: exception.to }], source: 'exception' };
  }

  if (schedule.weekly.length > 0) {
    const weekday = weekdayInZone(date);
    const ofDay = schedule.weekly.filter((r) => r.weekday === weekday);
    return { intervals: sortRanges(ofDay.map(({ from, to }) => ({ from, to }))), source: 'weekly' };
  }

  return { intervals: [DEFAULT_DAY], source: 'default' };
}

export async function scheduleForDate(db: Db, date: string): Promise<DaySchedule[]> {
  if (!isDateString(date)) {
    throw new ScheduleError('Дата має бути YYYY-MM-DD', 400, 'bad-date');
  }

  const groomers = await listGroomers(db);
  const docs = await db
    .collection<GroomerSchedule>(SCHEDULE_COLLECTION)
    .find({ groomerId: { $in: groomers.map((g) => g._id!) } })
    .toArray();

  const byGroomer = new Map(docs.map((d) => [d.groomerId.toHexString(), d]));

  return groomers.map((groomer) => {
    const id = groomer._id!.toHexString();
    const doc = byGroomer.get(id) ?? { weekly: [], exceptions: [] };
    const { intervals, source } = intervalsFor(doc, date);

    return { groomerId: id, name: groomer.username, intervals, source };
  });
}

export async function offHoursSlots(
  db: Db,
  groomerId: string,
  from: string,
  to: string
): Promise<{ scheduledAt: Date; durationMinutes: number }[]> {
  if (!ObjectId.isValid(groomerId)) return [];

  const doc = await db
    .collection<GroomerSchedule>(SCHEDULE_COLLECTION)
    .findOne({ groomerId: new ObjectId(groomerId) });

  if (!doc) return [];

  const blocks: { scheduledAt: Date; durationMinutes: number }[] = [];

  for (const date of datesBetween(from, to)) {
    const { intervals } = intervalsFor(doc, date);
    const dayStart = zonedToUtc(date, '00:00');
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

    if (intervals.length === 0) {
      blocks.push({ scheduledAt: dayStart, durationMinutes: 24 * 60 });
      continue;
    }

    let cursor = dayStart;
    for (const interval of intervals) {
      const start = zonedToUtc(date, interval.from);
      if (start > cursor) {
        blocks.push({
          scheduledAt: cursor,
          durationMinutes: Math.round((start.getTime() - cursor.getTime()) / 60000),
        });
      }
      cursor = zonedToUtc(date, interval.to);
    }

    if (cursor < dayEnd) {
      blocks.push({
        scheduledAt: cursor,
        durationMinutes: Math.round((dayEnd.getTime() - cursor.getTime()) / 60000),
      });
    }
  }

  return blocks;
}
