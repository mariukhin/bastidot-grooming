import { logger } from './logger.ts';

const DAY_MS = 24 * 60 * 60 * 1000;

export interface DailyScheduleOptions {
  name: string;
  runAt: string;
  timeZone: string;
  task: () => Promise<void>;
}

function zonedTimeParts(timeZone: string): { hour: number; minute: number; second: number } {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(new Date());

  const get = (type: string) => Number.parseInt(parts.find((p) => p.type === type)!.value, 10);
  return { hour: get('hour') % 24, minute: get('minute'), second: get('second') };
}

function msUntilNextRun(runAt: string, timeZone: string): number {
  const [rawHour, rawMinute] = runAt.split(':');
  const hour = Number.parseInt(rawHour ?? '', 10);
  const minute = Number.parseInt(rawMinute ?? '', 10);
  if (!(hour >= 0 && hour < 24) || !(minute >= 0 && minute < 60)) {
    throw new Error(`Invalid schedule time: ${runAt} (expected HH:MM)`);
  }

  const now = zonedTimeParts(timeZone);
  const nowMs = (now.hour * 60 + now.minute) * 60_000 + now.second * 1000;
  const targetMs = (hour * 60 + minute) * 60_000;

  const delay = targetMs - nowMs;
  return delay > 0 ? delay : delay + DAY_MS;
}

export function scheduleDaily(options: DailyScheduleOptions): () => void {
  let timer: NodeJS.Timeout;

  const plan = () => {
    const delay = msUntilNextRun(options.runAt, options.timeZone);
    logger.info(`Scheduled "${options.name}"`, {
      runAt: options.runAt,
      timeZone: options.timeZone,
      inMinutes: Math.round(delay / 60_000),
    });

    timer = setTimeout(async () => {
      try {
        await options.task();
      } catch (error) {
        logger.error(`Scheduled task "${options.name}" failed`, {
          message: error instanceof Error ? error.message : String(error),
        });
      } finally {
        plan();
      }
    }, delay);
  };

  plan();

  return () => clearTimeout(timer);
}
