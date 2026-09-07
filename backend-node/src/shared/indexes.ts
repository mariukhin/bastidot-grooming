import type { Db } from 'mongodb';
import { logger } from './logger.ts';

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
    db.collection('client').createIndexes([
      { key: { doNotContact: 1, lastVisitAt: -1 } },
      { key: { lastNotifiedAt: 1 } },
      { key: { phone: 1 } },
      { key: { phoneRaw: 1 } },
    ]),
  ]);

  for (const result of results) {
    if (result.status === 'rejected') {
      logger.error('Failed to ensure indexes', { message: result.reason.message });
    }
  }
}
