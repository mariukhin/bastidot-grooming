import { config } from './shared/config.ts';
import { logger } from './shared/logger.ts';
import { connectToDatabase, closeDatabase } from './shared/db.ts';
import { ensureIndexes } from './shared/indexes.ts';
import { createApp } from './app.ts';
import { scheduleDaily } from './shared/scheduler.ts';
import { runInactiveClientsDigest, isDigestEnabled } from './features/reminder/worker.ts';

const db = await connectToDatabase();
await ensureIndexes(db);

const app = createApp(db);

const stopReminderJob = config.reminderInProcess && isDigestEnabled()
  ? scheduleDaily({
      name: 'inactive-clients-digest',
      runAt: config.reminderRunAt,
      timeZone: config.reminderTimeZone,
      task: () => runInactiveClientsDigest(db).then(() => undefined),
    })
  : null;

if (!config.reminderInProcess) {
  logger.info('Планувальник дайджесту вимкнено (REMINDER_IN_PROCESS != true) — його запускає GitHub Actions');
}

const server = app.listen(config.port, () => {
  logger.info(`Server listening on http://localhost:${config.port}`);
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
