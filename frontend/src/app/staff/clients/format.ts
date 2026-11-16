import type { ClientSegment } from '@/api/staff';

export const money = (value: number): string =>
  `${new Intl.NumberFormat('uk-UA').format(Math.round(value))} грн`;

export const shortDate = (iso: string | null): string =>
  iso
    ? new Intl.DateTimeFormat('uk-UA', { day: 'numeric', month: 'short', year: 'numeric' })
        .format(new Date(iso))
        .replace(' р.', '')
    : '—';

export const monthYear = (iso: string | null): string =>
  iso
    ? new Intl.DateTimeFormat('uk-UA', { month: 'long', year: 'numeric' })
        .format(new Date(iso))
        .replace(' р.', '')
    : '—';

export const initials = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || '?';

/** «+380 50 111 22 33» — читається легше за суцільні цифри. */
export const prettyPhone = (phone: string): string => {
  const m = /^\+380(\d{2})(\d{3})(\d{2})(\d{2})$/.exec(phone);
  return m ? `+380 ${m[1]} ${m[2]} ${m[3]} ${m[4]}` : phone;
};

/** Порядок плиток і чипів «група». */
export const SEGMENT_ORDER: ClientSegment[] = ['regular', 'new', 'lapsed', 'no_visits'];

/** Шкала від 7 з 10 — привід попередити грумера. */
export const TRAIT_WARNING_FROM = 7;

export const dateTime = (iso: string): string =>
  new Intl.DateTimeFormat('uk-UA', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso));
