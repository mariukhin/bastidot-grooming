import type { ExceptionType, PendingWeekly, ScheduleException, WeeklyRule } from '@/api/staff';

/** Те саме, що DEFAULT_DAY на бекенді: шаблону ще немає — працює щодня 09–20. */
export const DEFAULT_HOURS = { from: '09:00', to: '20:00' };

/** Порядок рядків «Типового тижня»: з понеділка, як звикли в салоні. */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

export const WEEKDAY_LONG: Record<number, string> = {
  0: 'Неділя',
  1: 'Понеділок',
  2: 'Вівторок',
  3: 'Середа',
  4: 'Четвер',
  5: 'Пʼятниця',
  6: 'Субота',
};

export const WEEKDAY_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'];

/** Тип дня для календаря: від нього колір клітинки. */
export type DayKind = 'work' | 'custom' | 'vacation' | 'off';

export type DayInfo = {
  date: string;
  kind: DayKind;
  intervals: { from: string; to: string }[];
  exception: ScheduleException | null;
};

export type TimeRange = { from: string; to: string };

/** Рядок редактора: робочий день «з–до» і перерви всередині нього. */
export type WeekRow = {
  weekday: number;
  enabled: boolean;
  from: string;
  to: string;
  breaks: TimeRange[];
};

const pad = (n: number) => String(n).padStart(2, '0');

export const toDateString = (d: Date): string =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** День тижня календарної дати, без залежності від часової зони браузера. */
export const weekdayOf = (date: string): number => new Date(`${date}T12:00:00Z`).getUTCDay();

export const minutesOf = (time: string): number => {
  const [h, m] = time.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};

export const formatDay = (date: string): string => {
  const [y, m, d] = date.split('-').map(Number);
  return new Intl.DateTimeFormat('uk-UA', { day: 'numeric', month: 'long' }).format(
    new Date(y!, m! - 1, d!)
  );
};

export const formatShort = (date: string): string =>
  date.split('-').reverse().slice(0, 2).join('.');

export const formatRange = (e: Pick<ScheduleException, 'dateFrom' | 'dateTo'>): string =>
  e.dateFrom === e.dateTo
    ? formatShort(e.dateFrom)
    : `${formatShort(e.dateFrom)}–${formatShort(e.dateTo)}`;

export const isRange = (e: ScheduleException): boolean => e.dateFrom !== e.dateTo;

const KIND_OF_EXCEPTION: Record<ExceptionType, DayKind> = {
  vacation: 'vacation',
  sick: 'vacation',
  day_off: 'off',
  custom_hours: 'custom',
};

/** Дзеркало intervalsFor з бекенду: виняток важливіший за шаблон. */
export function resolveDay(
  weekly: WeeklyRule[],
  exceptions: ScheduleException[],
  date: string,
  pending: PendingWeekly | null = null
): DayInfo {
  const exception =
    [...exceptions].reverse().find((e) => e.dateFrom <= date && date <= e.dateTo) ?? null;

  if (exception) {
    const intervals =
      exception.type === 'custom_hours' && exception.from && exception.to
        ? [{ from: exception.from, to: exception.to }]
        : [];
    return { date, kind: KIND_OF_EXCEPTION[exception.type], intervals, exception };
  }

  // Збережений новий тиждень діє з понеділка — як і на бекенді.
  const template = pending && date >= pending.effectiveFrom ? pending.weekly : weekly;

  const intervals =
    template.length > 0
      ? template
          .filter((r) => r.weekday === weekdayOf(date))
          .map(({ from, to }) => ({ from, to }))
          .sort((a, b) => minutesOf(a.from) - minutesOf(b.from))
      : [DEFAULT_HOURS];

  return { date, kind: intervals.length > 0 ? 'work' : 'off', intervals, exception: null };
}

/** Клітинки місяця 7×N з понеділка; null — порожні клітинки до 1-го і після останнього. */
export function monthGrid(year: number, month: number): (string | null)[] {
  const first = new Date(year, month, 1);
  const days = new Date(year, month + 1, 0).getDate();
  const lead = (first.getDay() + 6) % 7;

  const cells: (string | null)[] = Array.from({ length: lead }, () => null);
  for (let d = 1; d <= days; d++) cells.push(toDateString(new Date(year, month, d)));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function monthStats(days: DayInfo[]): { workDays: number; hours: number } {
  const working = days.filter((d) => d.intervals.length > 0);
  const minutes = working.reduce(
    (sum, d) => sum + d.intervals.reduce((s, i) => s + minutesOf(i.to) - minutesOf(i.from), 0),
    0
  );
  return { workDays: working.length, hours: Math.round((minutes / 60) * 10) / 10 };
}

/** Шаблон із бекенду → 7 рядків редактора. Проміжки між інтервалами дня — це перерви. */
export function toWeekRows(weekly: WeeklyRule[]): WeekRow[] {
  return WEEK_ORDER.map((weekday) => {
    if (weekly.length === 0) return { weekday, enabled: true, ...DEFAULT_HOURS, breaks: [] };

    const ofDay = weekly
      .filter((r) => r.weekday === weekday)
      .sort((a, b) => minutesOf(a.from) - minutesOf(b.from));
    if (ofDay.length === 0) return { weekday, enabled: false, ...DEFAULT_HOURS, breaks: [] };

    const breaks = ofDay.slice(1).map((r, i) => ({ from: ofDay[i]!.to, to: r.from }));
    return { weekday, enabled: true, from: ofDay[0]!.from, to: ofDay.at(-1)!.to, breaks };
  });
}

/** Рядки редактора → інтервали для бекенду: робочий день мінус перерви. */
export function fromWeekRows(rows: WeekRow[]): WeeklyRule[] {
  return rows
    .filter((r) => r.enabled)
    .flatMap(({ weekday, from, to, breaks }) => {
      const sorted = [...breaks].sort((a, b) => minutesOf(a.from) - minutesOf(b.from));
      const out: WeeklyRule[] = [];
      let cursor = from;
      for (const b of sorted) {
        out.push({ weekday, from: cursor, to: b.from });
        cursor = b.to;
      }
      out.push({ weekday, from: cursor, to });
      return out;
    });
}

/** Чому рядок не можна зберегти; null — усе гаразд. */
export function rowError(row: WeekRow): string | null {
  if (!row.enabled) return null;
  if (!validRange(row.from, row.to)) return 'Початок дня має бути раніше за кінець';

  const sorted = [...row.breaks].sort((a, b) => minutesOf(a.from) - minutesOf(b.from));
  let cursor = minutesOf(row.from);
  for (const b of sorted) {
    if (!validRange(b.from, b.to)) return 'Перерва: початок має бути раніше за кінець';
    if (minutesOf(b.from) <= cursor || minutesOf(b.to) >= minutesOf(row.to)) {
      return 'Перерва має бути всередині робочого дня і не перетинатися з іншою';
    }
    cursor = minutesOf(b.to);
  }
  return null;
}

/** Перерва за замовчуванням — година посередині дня, округлена до 15 хв. */
export function suggestBreak(row: WeekRow): TimeRange {
  const last = row.breaks.at(-1);
  const start = last ? minutesOf(last.to) : minutesOf(row.from);
  const mid = Math.round((start + minutesOf(row.to)) / 2 / 15) * 15;
  const toTime = (m: number) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
  return { from: toTime(Math.max(mid - 30, start + 15)), to: toTime(mid + 30) };
}

/** «10», «9:30» — коротко для клітинки таблиці. */
export const shortTime = (time: string): string => {
  const [h, m] = time.split(':');
  return m === '00' ? String(Number(h)) : `${Number(h)}:${m}`;
};

export const formatDate = (date: string): string => date.split('-').reverse().join('.');

export const validRange = (from: string, to: string): boolean =>
  /^\d{2}:\d{2}$/.test(from) && /^\d{2}:\d{2}$/.test(to) && minutesOf(from) < minutesOf(to);

export const plural = (n: number, one: string, few: string, many: string): string => {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
};

export const ordersWord = (n: number) => `${n} ${plural(n, 'запис', 'записи', 'записів')}`;
