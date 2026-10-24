import { config } from '../../shared/config.ts';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function isDateString(value: unknown): value is string {
  return typeof value === 'string' && DATE_RE.test(value) && !Number.isNaN(Date.parse(value));
}

export function isTimeString(value: unknown): value is string {
  return typeof value === 'string' && TIME_RE.test(value);
}

export function minutesOf(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h! * 60 + m!;
}

function zoneOffsetMs(at: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(at);

  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? '0');
  const asUtc = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour') % 24,
    get('minute'),
    get('second')
  );

  return asUtc - at.getTime();
}

/**
 * «2026-10-24» + «09:00» у часовій зоні салону → момент у UTC.
 *
 * Графік задають стінним часом, а записи лежать у UTC, тож без цього
 * перетворення взимку й улітку робочий день поїхав би на годину.
 */
export function zonedToUtc(date: string, time: string, timeZone = config.timeZone): Date {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);

  const guess = Date.UTC(y!, m! - 1, d!, hh!, mm!);
  return new Date(guess - zoneOffsetMs(new Date(guess), timeZone));
}

/** Дата у форматі YYYY-MM-DD, як її бачать у салоні. */
export function dateInZone(at: Date, timeZone = config.timeZone): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(at);
}

/** День тижня (0 — неділя) у часовій зоні салону. */
export function weekdayInZone(date: string, timeZone = config.timeZone): number {
  const noon = zonedToUtc(date, '12:00', timeZone);
  const name = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short' }).format(noon);
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(name);
}

/** Усі дати діапазону включно. */
export function datesBetween(from: string, to: string): string[] {
  const out: string[] = [];
  const cursor = new Date(`${from}T00:00:00.000Z`);
  const end = new Date(`${to}T00:00:00.000Z`);

  while (cursor <= end && out.length < 400) {
    out.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return out;
}
