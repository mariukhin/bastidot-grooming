import { connectToDatabase, closeDatabase } from '../../shared/db.ts';
import { logger } from '../../shared/logger.ts';
import {
  runInactiveClientsDigest,
  previewInactiveClientsDigest,
  shouldSkipScheduledRun,
} from './worker.ts';

const isDryRun = process.argv.includes('--dry-run');
const isScheduled = process.argv.includes('--scheduled');

const db = await connectToDatabase();

try {
  if (isDryRun) {
    process.stdout.write((await previewInactiveClientsDigest(db)) + '\n');
    logger.info('Dry run finished: nothing sent, nothing logged');
  } else {
    const skip = isScheduled ? await shouldSkipScheduledRun(db) : null;

    if (skip === 'early') {
      logger.info('Ще рано за київським часом — цей запуск нічого не робить');
    } else if (skip === 'already-sent') {
      logger.info('Дайджест сьогодні вже надсилали — цей запуск нічого не робить');
    } else {
      const count = await runInactiveClientsDigest(db);
      logger.info('Manual digest run finished', { count });
    }
  }
} catch (error) {
  logger.error('Manual digest run failed', {
    message: error instanceof Error ? error.message : String(error),
  });
  process.exitCode = 1;
} finally {
  await closeDatabase();
}
