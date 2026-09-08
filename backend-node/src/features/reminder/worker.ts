import type { Db } from 'mongodb';
import ReminderService from './service.ts';
import type { LapsedClient, LapsedClientGroups } from './types.ts';
import { config } from '../../shared/config.ts';
import { logger } from '../../shared/logger.ts';
import { escapeHtml, isTelegramConfigured, sendTelegramMessage } from '../../shared/telegram.ts';

const DAY_MS = 24 * 60 * 60 * 1000;

const GROUP_BADGE: Record<string, string> = {
  'Постійний': '⭐️ Постійний',
  'Втрачений': 'Втрачений',
  'Новий': 'Новий',
};

function plural(count: number, forms: [string, string, string]): string {
  const mod100 = count % 100;
  const mod10 = count % 10;
  if (mod100 >= 11 && mod100 <= 14) return forms[2];
  if (mod10 === 1) return forms[0];
  if (mod10 >= 2 && mod10 <= 4) return forms[1];
  return forms[2];
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('uk-UA', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: config.reminderTimeZone,
  }).format(date);
}

function formatClient(client: LapsedClient, position: number, now: Date): string {
  const days = Math.floor((now.getTime() - new Date(client.lastVisitAt).getTime()) / DAY_MS);

  const name = escapeHtml(client.name || 'Без імені');
  const badge = GROUP_BADGE[client.crmGroup];
  const title = badge ? `<b>${name}</b> · ${badge}` : `<b>${name}</b>`;

  const lines = [`${position}. ${title}`, `📞 ${escapeHtml(client.phone)}`];

  if (client.petName) {
    const breed = client.petBreed ? ' · ' + escapeHtml(client.petBreed) : '';
    const age = client.petAge
      ? `, ${client.petAge} ${plural(client.petAge, ['рік', 'роки', 'років'])}`
      : '';
    lines.push(`🐶 ${escapeHtml(client.petName)}${breed}${age}`);
  }

  lines.push(
    `🗓 Останній візит: ${formatDate(new Date(client.lastVisitAt))} — ${days} ${plural(days, ['день', 'дні', 'днів'])} тому`
  );
  if (client.visitsCount > 0) {
    lines.push(`↩️ Усього візитів: ${client.visitsCount}`);
  } else if (client.dateSource.includes('стара CRM')) {
    lines.push('↩️ Картка зі старої CRM — лічильник візитів не зберігся');
  }

  return lines.join('\n');
}

function formatSection(
  heading: string,
  clients: LapsedClient[],
  startFrom: number,
  now: Date
): string {
  const body = clients
    .map((client, index) => formatClient(client, startFrom + index, now))
    .join('\n\n');

  return `${heading}\n\n${body}`;
}

export function buildDigestMessage(groups: LapsedClientGroups, now: Date = new Date()): string {
  const threshold = `${config.reminderInactiveDays} ${plural(config.reminderInactiveDays, ['дня', 'днів', 'днів'])}`;
  const sections: string[] = [];

  if (groups.warm.length > 0) {
    sections.push(
      formatSection(
        `🔥 <b>Теплі</b> — щойно перетнули поріг ${threshold}, ще памʼятають салон`,
        groups.warm,
        1,
        now
      )
    );
  }

  if (groups.cold.length > 0) {
    sections.push(
      formatSection(
        `❄️ <b>Холодні</b> — не були найдовше`,
        groups.cold,
        groups.warm.length + 1,
        now
      )
    );
  }

  const header = `🔔 <b>Кому нагадати про грумінг</b>\n${formatDate(now)}`;

  return [
    header,
    ...sections,
    '<i>Напишіть або зателефонуйте — можливо, просто забули, що песику пора на грумінг.</i>',
  ].join('\n\n');
}

export async function previewInactiveClientsDigest(
  db: Db,
  now: Date = new Date()
): Promise<string> {
  const groups = await ReminderService.findLapsedClients(
    db,
    {
      inactiveDays: config.reminderInactiveDays,
      cooldownDays: config.reminderCooldownDays,
      warmSize: config.reminderWarmSize,
      coldSize: config.reminderColdSize,
    },
    now
  );

  if (groups.warm.length === 0 && groups.cold.length === 0) {
    return 'Нікого нагадувати: під критерії не підпадає жоден клієнт.';
  }

  return buildDigestMessage(groups, now);
}

function zoneParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date);
  const get = (type: string) => Number.parseInt(parts.find((p) => p.type === type)!.value, 10);
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour') % 24,
    minute: get('minute'),
    second: get('second'),
  };
}

function startOfDayInZone(now: Date, timeZone: string): Date {
  const p = zoneParts(now, timeZone);
  const guess = Date.UTC(p.year, p.month - 1, p.day);
  const shifted = zoneParts(new Date(guess), timeZone);
  const offset =
    Date.UTC(shifted.year, shifted.month - 1, shifted.day, shifted.hour, shifted.minute, shifted.second) - guess;
  return new Date(guess - offset);
}

export type SkipReason = 'early' | 'already-sent';

export async function shouldSkipScheduledRun(
  db: Db,
  now: Date = new Date()
): Promise<SkipReason | null> {
  const [hour, minute] = config.reminderRunAt.split(':').map((v) => Number.parseInt(v, 10));
  const local = zoneParts(now, config.reminderTimeZone);

  if (local.hour * 60 + local.minute < (hour ?? 11) * 60 + (minute ?? 0)) {
    return 'early';
  }
  if (await ReminderService.wasSentSince(db, startOfDayInZone(now, config.reminderTimeZone))) {
    return 'already-sent';
  }
  return null;
}

export async function runInactiveClientsDigest(db: Db, now: Date = new Date()): Promise<number> {
  const groups = await ReminderService.findLapsedClients(
    db,
    {
      inactiveDays: config.reminderInactiveDays,
      cooldownDays: config.reminderCooldownDays,
      warmSize: config.reminderWarmSize,
      coldSize: config.reminderColdSize,
    },
    now
  );

  const total = groups.warm.length + groups.cold.length;
  if (total === 0) {
    logger.info('Inactive clients digest: nobody to remind');
    return 0;
  }

  await sendTelegramMessage(buildDigestMessage(groups, now));
  await ReminderService.markNotified(db, groups, now);

  logger.info('Inactive clients digest sent', {
    warm: groups.warm.length,
    cold: groups.cold.length,
  });
  return total;
}

export function isDigestEnabled(): boolean {
  if (!isTelegramConfigured()) {
    logger.warn('Inactive clients worker is disabled: TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is missing');
    return false;
  }
  return true;
}
