import { config } from './shared/config.ts';
import { logger } from './shared/logger.ts';
import { connectToDatabase, closeDatabase } from './shared/db.ts';
import { ensureIndexes } from './shared/indexes.ts';
import { createApp } from './app.ts';

const db = await connectToDatabase();
await ensureIndexes(db);

const app = createApp(db);

const server = app.listen(config.port, () => {
  logger.info(`Server listening on http://localhost:${config.port}`);
});

async function shutdown(signal: NodeJS.Signals): Promise<void> {
  logger.warn(`${signal} received, shutting down...`);
  server.close(async () => {
    await closeDatabase();
    logger.info('Server closed');
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
