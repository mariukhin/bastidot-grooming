import type { Db } from 'mongodb';
import { logger } from '../logger.ts';

// Дзеркало backend/bootstrap/indexes.go — безпечно викликати на кожному
// старті: Mongo ігнорує вже існуючі ідентичні індекси.
export async function ensureIndexes(db: Db): Promise<void> {
  const results = await Promise.allSettled([
    db.collection('user').createIndexes([
      { key: { email: 1 }, unique: true },
      { key: { phoneNumber: 1 }, unique: true },
    ]),
    db.collection('order').createIndexes([
      { key: { groomerId: 1, scheduledAt: 1 } },
      { key: { clientId: 1 } },
      { key: { petId: 1, status: 1 } },
    ]),
    db.collection('pet').createIndexes([{ key: { userId: 1 } }]),
  ]);

  for (const result of results) {
    if (result.status === 'rejected') {
      logger.error('Failed to ensure indexes', { message: result.reason.message });
    }
  }
}
