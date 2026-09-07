import { connectToDatabase, closeDatabase } from '../../shared/db.ts';
import { logger } from '../../shared/logger.ts';
import { runInactiveClientsDigest, previewInactiveClientsDigest } from './worker.ts';

const isDryRun = process.argv.includes('--dry-run');

const db = await connectToDatabase();

try {
  if (isDryRun) {
    process.stdout.write((await previewInactiveClientsDigest(db)) + '\n');
    logger.info('Dry run finished: nothing sent, nothing logged');
  } else {
    const count = await runInactiveClientsDigest(db);
    logger.info('Manual digest run finished', { count });
  }
} catch (error) {
  logger.error('Manual digest run failed', {
    message: error instanceof Error ? error.message : String(error),
  });
  process.exitCode = 1;
} finally {
  await closeDatabase();
}
