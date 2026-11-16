import { ObjectId } from 'mongodb';
import type { Db } from 'mongodb';

import { USER_COLLECTION, type User } from '../../shared/user.ts';
import { canSendTelegram, escapeHtml, sendTelegramMessage } from '../../shared/telegram.ts';
import { logger } from '../../shared/logger.ts';
import { ORDER_COLLECTION, type Order } from '../order/types.ts';
import {
  DEFAULT_DAY,
  EXCEPTION_LABEL,
  EXCEPTION_TYPES,
  MAX_EXCEPTION_DAYS,
  SCHEDULE_CHANGE_COLLECTION,
  SCHEDULE_COLLECTION,
  ScheduleError,
  type ExceptionType,
  type GroomerSchedule,
  type LegacyScheduleException,
  type PendingWeekly,
  type ScheduleChange,
  type ScheduleChangeAction,
  type ScheduleException,
  type TimeRange,
  type WeeklyRule,
} from './types.ts';
import {
  dateInZone,
  datesBetween,
  isDateString,
  isTimeString,
  minutesOf,
  weekdayInZone,
  zonedToUtc,
} from './time.ts';

export interface DaySchedule {
  groomerId: string;
  name: string;
  intervals: TimeRange[];
  /** Звідки взявся день: шаблон, виняток на дату чи усталені години. */
  source: 'weekly' | 'exception' | 'default';
  /** Тип винятку, якщо день узявся з нього — щоб сітка підписала «Відпустка». */
  exceptionType?: ExceptionType;
}

/** Хто міняє графік. Береться з токена, а не з тіла запиту. */
export interface ScheduleActor {
  id: string;
  role: 'admin' | 'groomer';
}

export interface ScheduleView {
  groomerId: ObjectId;
  name: string;
  onlineBooking: boolean;
  /** Шаблон, що діє зараз. */
  weekly: WeeklyRule[];
  /** Збережений, але ще не чинний шаблон — з найближчого понеділка. */
  pendingWeekly: PendingWeekly | null;
  exceptions: ScheduleException[];
}

/** Усе, з чого складається день: шаблон, майбутній шаблон і винятки. */
export type ScheduleShape = Pick<GroomerSchedule, 'weekly' | 'exceptions'> & {
  pendingWeekly?: PendingWeekly | null;
};

/** Наскільки вперед перевіряти записи, коли міняється тижневий шаблон. */
const WEEKLY_IMPACT_DAYS = 180;
const DAY_MS = 24 * 60 * 60 * 1000;

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

export type ExceptionInput = Omit<ScheduleException, 'id' | 'changedBy' | 'changedAt'>;

/** Тіло POST винятку: { type, dateFrom, dateTo?, from?, to?, note? }. */
export function parseException(body: unknown): ExceptionInput {
  const b = (body ?? {}) as Record<string, unknown>;

  if (!EXCEPTION_TYPES.includes(b.type as ExceptionType)) {
    throw new ScheduleError(
      `type має бути одним із: ${EXCEPTION_TYPES.join(', ')}`,
      400,
      'bad-type'
    );
  }
  const type = b.type as ExceptionType;

  const dateFrom = b.dateFrom;
  const dateTo = b.dateTo ?? b.dateFrom;
  if (!isDateString(dateFrom) || !isDateString(dateTo)) {
    throw new ScheduleError('dateFrom і dateTo мають бути YYYY-MM-DD', 400, 'bad-date');
  }
  if (dateTo < dateFrom) {
    throw new ScheduleError('dateTo не може бути раніше за dateFrom', 400, 'bad-date-range');
  }
  if (datesBetween(dateFrom, dateTo).length > MAX_EXCEPTION_DAYS) {
    throw new ScheduleError(`Виняток довший за ${MAX_EXCEPTION_DAYS} днів`, 400, 'too-long');
  }

  const note = typeof b.note === 'string' ? b.note.trim().slice(0, 500) : '';
  const base = { type, dateFrom, dateTo, ...(note ? { note } : {}) };

  // Години мають сенс лише для custom_hours; у відпустці чи вихідному їх
  // ігноруємо, а не зберігаємо — інакше хтось колись їх прочитає.
  return type === 'custom_hours' ? { ...base, ...parseRange(b, 'виняток') } : base;
}

function isLegacy(e: ScheduleException | LegacyScheduleException): e is LegacyScheduleException {
  return !('dateFrom' in e) || !e.dateFrom;
}

/** Старі однодатні винятки читаємо як нові — і переписуємо при першій зміні. */
export function normalizeException(e: ScheduleException | LegacyScheduleException): ScheduleException {
  if (!isLegacy(e)) return e;

  const hasHours = !e.dayOff && Boolean(e.from && e.to);
  return {
    id: e.date,
    type: hasHours ? 'custom_hours' : 'day_off',
    dateFrom: e.date,
    dateTo: e.date,
    ...(hasHours ? { from: e.from!, to: e.to! } : {}),
  };
}

function toObjectId(id: string, message: string): ObjectId {
  if (!ObjectId.isValid(id)) throw new ScheduleError(message, 404, 'no-groomer');
  return new ObjectId(id);
}

async function loadGroomer(db: Db, groomerId: string): Promise<User> {
  const _id = toObjectId(groomerId, 'Грумера не знайдено');
  const groomer = await db
    .collection<User>(USER_COLLECTION)
    .findOne({ _id, isGroomer: true }, { projection: { username: 1, onlineBooking: 1 } });

  if (!groomer) {
    throw new ScheduleError('Грумера не знайдено', 404, 'no-groomer');
  }
  return groomer;
}

/** Грумер міняє лише свій графік; адмін — будь-чий. */
function assertCanEdit(actor: ScheduleActor, groomerId: string): void {
  if (actor.role !== 'admin' && actor.id !== groomerId) {
    throw new ScheduleError('Можна змінювати лише власний графік', 403, 'not-own');
  }
}

export async function getSchedule(db: Db, groomerId: string): Promise<ScheduleView> {
  const groomer = await loadGroomer(db, groomerId);
  const doc = await db
    .collection<GroomerSchedule>(SCHEDULE_COLLECTION)
    .findOne({ groomerId: groomer._id! });

  // Майбутній шаблон, чия дата вже настала, — це просто чинний шаблон.
  // Переписуємо його в базі ліниво, при наступній зміні.
  const today = dateInZone(new Date());
  const pending = doc?.pendingWeekly ?? null;
  const promoted = pending !== null && pending.effectiveFrom <= today;

  return {
    groomerId: groomer._id!,
    name: groomer.username,
    onlineBooking: groomer.onlineBooking !== false,
    weekly: promoted ? pending.weekly : (doc?.weekly ?? []),
    pendingWeekly: promoted ? null : pending,
    exceptions: (doc?.exceptions ?? [])
      .map(normalizeException)
      .sort((a, b) => a.dateFrom.localeCompare(b.dateFrom)),
  };
}

/** Виняток, що покриває дату. Пізніший у списку важливіший (лише для старих даних). */
function exceptionOn(
  exceptions: (ScheduleException | LegacyScheduleException)[],
  date: string
): ScheduleException | null {
  for (let i = exceptions.length - 1; i >= 0; i--) {
    const e = normalizeException(exceptions[i]!);
    if (e.dateFrom <= date && date <= e.dateTo) return e;
  }
  return null;
}

/** Робочі інтервали одного дня: виняток важливіший за шаблон. */
export function intervalsFor(
  schedule: ScheduleShape,
  date: string
): { intervals: TimeRange[]; source: DaySchedule['source']; exceptionType?: ExceptionType } {
  const exception = exceptionOn(schedule.exceptions, date);

  if (exception) {
    const intervals =
      exception.type === 'custom_hours' && exception.from && exception.to
        ? [{ from: exception.from, to: exception.to }]
        : [];
    return { intervals, source: 'exception', exceptionType: exception.type };
  }

  const weekly =
    schedule.pendingWeekly && date >= schedule.pendingWeekly.effectiveFrom
      ? schedule.pendingWeekly.weekly
      : schedule.weekly;

  if (weekly.length > 0) {
    const weekday = weekdayInZone(date);
    const ofDay = weekly.filter((r) => r.weekday === weekday);
    return { intervals: sortRanges(ofDay.map(({ from, to }) => ({ from, to }))), source: 'weekly' };
  }

  return { intervals: [DEFAULT_DAY], source: 'default' };
}

/** Чи повністю вміщається візит у робочі години свого дня. */
export function fitsSchedule(
  schedule: ScheduleShape,
  order: Pick<Order, 'scheduledAt' | 'durationMinutes'>
): boolean {
  const date = dateInZone(order.scheduledAt);
  const start = order.scheduledAt.getTime();
  const end = start + order.durationMinutes * 60_000;

  return intervalsFor(schedule, date).intervals.some(
    (i) => zonedToUtc(date, i.from).getTime() <= start && end <= zonedToUtc(date, i.to).getTime()
  );
}

/**
 * Майбутні активні записи грумера в проміжку, які не вміщаються в графік.
 * Саму зміну не блокуємо — салон має право піти у відпустку, — але адмін
 * мусить знати, кого обдзвонити (див. подію «reschedule» в events.ts).
 */
export async function ordersOffSchedule(
  db: Db,
  groomerId: ObjectId,
  schedule: ScheduleShape,
  from: Date,
  to: Date
): Promise<Order[]> {
  const now = new Date();
  const start = from > now ? from : now;
  if (start >= to) return [];

  const orders = await db
    .collection<Order>(ORDER_COLLECTION)
    .find({ groomerId, status: 'pending', scheduledAt: { $gte: start, $lt: to } })
    .toArray();

  return orders.filter((order) => !fitsSchedule(schedule, order));
}

function exceptionSpan(e: Pick<ScheduleException, 'dateFrom' | 'dateTo'>): { from: Date; to: Date } {
  return {
    from: zonedToUtc(e.dateFrom, '00:00'),
    to: new Date(zonedToUtc(e.dateTo, '00:00').getTime() + DAY_MS),
  };
}

function formatRange(e: Pick<ScheduleException, 'dateFrom' | 'dateTo' | 'from' | 'to'>): string {
  const day = (d: string) => d.split('-').reverse().join('.');
  const dates = e.dateFrom === e.dateTo ? day(e.dateFrom) : `${day(e.dateFrom)}–${day(e.dateTo)}`;
  return e.from && e.to ? `${dates}, ${e.from}–${e.to}` : dates;
}

/** Коли графік міняє сам грумер, адмін дізнається з робочого чату. */
function notifyAdmin(name: string, summary: string, affected: number): void {
  if (!canSendTelegram()) {
    logger.info('Зміна графіка грумером — Telegram вимкнено, сповіщення лише в лог', {
      groomer: name,
      summary,
      affected,
    });
    return;
  }

  const lines = [
    '🗓 <b>Грумер змінив графік</b>',
    `${escapeHtml(name)}: ${escapeHtml(summary)}`,
    affected > 0 ? `⚠️ Зачіпає записів: <b>${affected}</b> — їх треба перенести` : '',
  ].filter(Boolean);

  sendTelegramMessage(lines.join('\n')).catch((err: unknown) => {
    logger.error('Не вдалося надіслати сповіщення про зміну графіка', {
      error: err instanceof Error ? err.message : String(err),
    });
  });
}

async function writeSchedule(
  db: Db,
  actor: ScheduleActor,
  groomerId: ObjectId,
  patch: Partial<Pick<GroomerSchedule, 'weekly' | 'exceptions' | 'pendingWeekly'>>
): Promise<void> {
  await db.collection<GroomerSchedule>(SCHEDULE_COLLECTION).updateOne(
    { groomerId },
    {
      $set: { ...patch, updatedAt: new Date(), updatedBy: new ObjectId(actor.id) },
      $setOnInsert: {
        groomerId,
        ...(patch.weekly ? {} : { weekly: [] }),
        ...(patch.exceptions ? {} : { exceptions: [] }),
      },
    },
    { upsert: true }
  );
}

async function logChange(
  db: Db,
  actor: ScheduleActor,
  groomerId: ObjectId,
  action: ScheduleChangeAction,
  details: Record<string, unknown>,
  affectedOrders: number
): Promise<void> {
  await db.collection<ScheduleChange>(SCHEDULE_CHANGE_COLLECTION).insertOne({
    groomerId,
    changedBy: new ObjectId(actor.id),
    changedByRole: actor.role,
    changedAt: new Date(),
    action,
    details,
    affectedOrders,
  });
}

export interface ScheduleChangeResult {
  /** Скільки вже існуючих записів тепер поза робочим часом — для попередження на фронті. */
  affectedOrders: number;
}

/** Найближчий понеділок після сьогодні (у часовій зоні салону). */
export function nextMonday(today = dateInZone(new Date())): string {
  const weekday = weekdayInZone(today);
  const ahead = (8 - weekday) % 7 || 7;
  const d = new Date(`${today}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + ahead);
  return d.toISOString().slice(0, 10);
}

export interface WeeklySaveResult extends ScheduleChangeResult {
  /** З якої дати діє новий шаблон: поточний тиждень лишається як був. */
  effectiveFrom: string;
}

export async function saveWeekly(
  db: Db,
  actor: ScheduleActor,
  groomerId: string,
  weekly: WeeklyRule[]
): Promise<WeeklySaveResult> {
  assertCanEdit(actor, groomerId);
  const current = await getSchedule(db, groomerId);

  const effectiveFrom = nextMonday();
  const pendingWeekly: PendingWeekly = {
    effectiveFrom,
    weekly,
    changedBy: new ObjectId(actor.id),
    changedAt: new Date(),
  };

  // current.weekly уже враховує шаблон, що встиг набрати чинності.
  await writeSchedule(db, actor, current.groomerId, { weekly: current.weekly, pendingWeekly });

  const from = zonedToUtc(effectiveFrom, '00:00');
  const affected = await ordersOffSchedule(
    db,
    current.groomerId,
    { weekly: current.weekly, pendingWeekly, exceptions: current.exceptions },
    from,
    new Date(from.getTime() + WEEKLY_IMPACT_DAYS * DAY_MS)
  );

  await logChange(db, actor, current.groomerId, 'weekly', { weekly, effectiveFrom }, affected.length);
  if (actor.role === 'groomer') {
    notifyAdmin(
      current.name,
      `новий типовий тиждень з ${effectiveFrom.split('-').reverse().join('.')}`,
      affected.length
    );
  }

  return { affectedOrders: affected.length, effectiveFrom };
}

/** Хто змінив виняток і скільки майбутніх записів він зачіпає — для списку відсутностей. */
export async function describeExceptions(
  db: Db,
  view: ScheduleView
): Promise<(ScheduleException & { changedByName: string | null; affectedOrders: number })[]> {
  const authorIds = [
    ...new Set(
      view.exceptions
        .map((e) => e.changedBy?.toHexString())
        .filter((id): id is string => Boolean(id))
    ),
  ].map((id) => new ObjectId(id));

  const authors =
    authorIds.length > 0
      ? await db
          .collection<User>(USER_COLLECTION)
          .find({ _id: { $in: authorIds } }, { projection: { username: 1 } })
          .toArray()
      : [];
  const nameById = new Map(authors.map((u) => [u._id!.toHexString(), u.username]));
  const now = new Date();

  return await Promise.all(
    view.exceptions.map(async (e) => {
      const span = exceptionSpan(e);
      const affected =
        span.to > now
          ? (await ordersOffSchedule(db, view.groomerId, view, span.from, span.to)).length
          : 0;
      return {
        ...e,
        changedByName: e.changedBy ? (nameById.get(e.changedBy.toHexString()) ?? null) : null,
        affectedOrders: affected,
      };
    })
  );
}

export async function addException(
  db: Db,
  actor: ScheduleActor,
  groomerId: string,
  input: ExceptionInput
): Promise<ScheduleChangeResult & { exception: ScheduleException }> {
  assertCanEdit(actor, groomerId);
  const current = await getSchedule(db, groomerId);

  // Перекриття не зливаємо мовчки: незрозуміло, що важливіше — лікарняний
  // чи «інші години» в той самий день. Хай людина спершу прибере старий.
  const clash = current.exceptions.find(
    (e) => e.dateFrom <= input.dateTo && input.dateFrom <= e.dateTo
  );
  if (clash) {
    throw new ScheduleError(
      `На ці дати вже є виняток: ${EXCEPTION_LABEL[clash.type]} ${formatRange(clash)}`,
      409,
      'exception-overlap'
    );
  }

  const exception: ScheduleException = {
    ...input,
    id: new ObjectId().toHexString(),
    changedBy: new ObjectId(actor.id),
    changedAt: new Date(),
  };
  const exceptions = [...current.exceptions, exception];

  await writeSchedule(db, actor, current.groomerId, { exceptions });

  const span = exceptionSpan(exception);
  const affected = await ordersOffSchedule(
    db,
    current.groomerId,
    { weekly: current.weekly, pendingWeekly: current.pendingWeekly, exceptions },
    span.from,
    span.to
  );

  await logChange(db, actor, current.groomerId, 'exception-add', { exception }, affected.length);
  if (actor.role === 'groomer') {
    notifyAdmin(
      current.name,
      `${EXCEPTION_LABEL[exception.type]} ${formatRange(exception)}`,
      affected.length
    );
  }

  return { exception, affectedOrders: affected.length };
}

export async function removeException(
  db: Db,
  actor: ScheduleActor,
  groomerId: string,
  exceptionId: string
): Promise<ScheduleChangeResult | null> {
  assertCanEdit(actor, groomerId);
  const current = await getSchedule(db, groomerId);

  const removed = current.exceptions.find((e) => e.id === exceptionId);
  if (!removed) return null;

  const exceptions = current.exceptions.filter((e) => e.id !== exceptionId);
  await writeSchedule(db, actor, current.groomerId, { exceptions });

  // Прибраний виняток теж може залишити записи поза графіком: наприклад,
  // «інші години» до 21:00, на які вже записали клієнта.
  const span = exceptionSpan(removed);
  const affected = await ordersOffSchedule(
    db,
    current.groomerId,
    { weekly: current.weekly, pendingWeekly: current.pendingWeekly, exceptions },
    span.from,
    span.to
  );

  await logChange(db, actor, current.groomerId, 'exception-remove', { exception: removed }, affected.length);
  if (actor.role === 'groomer') {
    notifyAdmin(
      current.name,
      `скасовано: ${EXCEPTION_LABEL[removed.type]} ${formatRange(removed)}`,
      affected.length
    );
  }

  return { affectedOrders: affected.length };
}

/** Онлайн-запис до грумера. Вимикає лише адмін: це рішення салону, не майстра. */
export async function setOnlineBooking(
  db: Db,
  actor: ScheduleActor,
  groomerId: string,
  onlineBooking: boolean
): Promise<void> {
  if (actor.role !== 'admin') {
    throw new ScheduleError('Онлайн-запис вмикає й вимикає адміністратор', 403, 'admin-only');
  }
  const groomer = await loadGroomer(db, groomerId);

  await db
    .collection<User>(USER_COLLECTION)
    .updateOne({ _id: groomer._id! }, { $set: { onlineBooking } });
  await logChange(db, actor, groomer._id!, 'online-booking', { onlineBooking }, 0);
}

async function listGroomers(db: Db): Promise<User[]> {
  return await db
    .collection<User>(USER_COLLECTION)
    .find({ isGroomer: true }, { projection: { username: 1, isGroomer: 1 } })
    .toArray();
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
    const { intervals, source, exceptionType } = intervalsFor(doc, date);

    return {
      groomerId: id,
      name: groomer.username,
      intervals,
      source,
      ...(exceptionType ? { exceptionType } : {}),
    };
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
    const dayEnd = new Date(dayStart.getTime() + DAY_MS);

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
