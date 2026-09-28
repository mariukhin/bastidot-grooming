export type CalendarEvent = {
  uid: string;
  start: Date;
  durationMinutes: number;
  title: string;
  description: string[];
  location: string;
  url?: string;
  /** За скільки хвилин до візиту нагадати. 0 — без нагадування. */
  remindBeforeMinutes?: number;
};

const pad = (value: number): string => String(value).padStart(2, '0');

const toUtcStamp = (date: Date): string =>
  [
    date.getUTCFullYear(),
    pad(date.getUTCMonth() + 1),
    pad(date.getUTCDate()),
    'T',
    pad(date.getUTCHours()),
    pad(date.getUTCMinutes()),
    pad(date.getUTCSeconds()),
    'Z',
  ].join('');

const escapeText = (value: string): string =>
  value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

// RFC 5545: рядок не довший за 75 октетів, продовження починається з пробілу.
// Рахуємо саме октети, а не символи: кирилиця в UTF-8 важить два байти, тож
// по символах ліміт спрацював би вдвічі пізніше і Google Calendar обрізав би опис.
const foldLine = (line: string): string => {
  const encoder = new TextEncoder();
  const chunks: string[] = [];
  let current = '';
  let bytes = 0;

  for (const char of line) {
    const size = encoder.encode(char).length;
    if (bytes + size > 75) {
      chunks.push(current);
      current = '';
      bytes = 1; // ведучий пробіл наступного рядка теж входить у ліміт
    }
    current += char;
    bytes += size;
  }
  chunks.push(current);

  return chunks.join('\r\n ');
};

export const buildIcs = (event: CalendarEvent): string => {
  const end = new Date(event.start.getTime() + event.durationMinutes * 60_000);
  const remind = event.remindBeforeMinutes ?? 0;

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Bastidot Grooming//booking//UK',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${event.uid}`,
    `DTSTAMP:${toUtcStamp(new Date())}`,
    `DTSTART:${toUtcStamp(event.start)}`,
    `DTEND:${toUtcStamp(end)}`,
    `SUMMARY:${escapeText(event.title)}`,
    `DESCRIPTION:${escapeText(event.description.filter(Boolean).join('\n'))}`,
    `LOCATION:${escapeText(event.location)}`,
    ...(event.url ? [`URL:${escapeText(event.url)}`] : []),
    'STATUS:CONFIRMED',
    ...(remind > 0
      ? [
          'BEGIN:VALARM',
          `TRIGGER:-PT${remind}M`,
          'ACTION:DISPLAY',
          `DESCRIPTION:${escapeText(event.title)}`,
          'END:VALARM',
        ]
      : []),
    'END:VEVENT',
    'END:VCALENDAR',
  ];

  return lines.map(foldLine).join('\r\n') + '\r\n';
};

export const downloadIcs = (fileName: string, content: string): void => {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();

  // Safari читає blob асинхронно вже після кліку, тож відкликати URL одразу не можна.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
};
