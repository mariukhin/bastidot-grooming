import { config } from './shared/config.ts';
import { logger } from './shared/logger.ts';
import { connectToDatabase, closeDatabase } from './shared/db.ts';
import { ensureIndexes } from './shared/indexes.ts';
import { createApp } from './app.ts';
import { scheduleDaily } from './shared/scheduler.ts';
import {
  runInactiveClientsDigest,
  shouldSkipScheduledRun,
  isDigestEnabled,
} from './features/reminder/worker.ts';

const db = await connectToDatabase();
await ensureIndexes(db);

const app = createApp(db);

const digestEnabled = config.reminderInProcess && isDigestEnabled();

const stopReminderJob = digestEnabled
  ? scheduleDaily({
      name: 'inactive-clients-digest',
      runAt: config.reminderRunAt,
      timeZone: config.reminderTimeZone,
      task: () => runInactiveClientsDigest(db).then(() => undefined),
    })
  : null;

if (!config.reminderInProcess) {
  logger.info('Планувальник дайджесту вимкнено (REMINDER_IN_PROCESS != true)');
}

async function catchUpMissedDigest(): Promise<void> {
  const skip = await shouldSkipScheduledRun(db);
  if (skip !== null) {
    return;
  }

  logger.warn('Сьогоднішній дайджест пропущено — надсилаємо навздогін');
  await runInactiveClientsDigest(db);
}

const server = app.listen(config.port, () => {
  logger.info(`Server listening on http://localhost:${config.port}`);

  if (digestEnabled) {
    // Не блокує старт: health-check не має чекати на Mongo-запит і Telegram.
    catchUpMissedDigest().catch((error: unknown) => {
      logger.error('Не вдалося надіслати пропущений дайджест', {
        message: error instanceof Error ? error.message : String(error),
      });
    });
  }
});

async function shutdown(signal: NodeJS.Signals): Promise<void> {
  logger.warn(`${signal} received, shutting down...`);
  stopReminderJob?.();
  server.close(async () => {
    await closeDatabase();
    logger.info('Server closed');
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
