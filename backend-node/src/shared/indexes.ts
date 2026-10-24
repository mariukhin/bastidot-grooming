import type { Db } from 'mongodb';
import { logger } from './logger.ts';
import { OTP_COLLECTION, OTP_RETENTION_SEC } from '../features/otp/types.ts';
import { SCHEDULE_COLLECTION } from '../features/schedule/types.ts';

async function dropDenseEmailIndex(db: Db): Promise<void> {
  const exists = await db.listCollections({ name: 'user' }, { nameOnly: true }).hasNext();
  if (!exists) return;

  const indexes = await db.collection('user').indexes();
  const email = indexes.find((index) => index.name === 'email_1');

  if (email && email.sparse !== true) {
    await db.collection('user').dropIndex('email_1');
    logger.info('Старий індекс email_1 прибрано — перестворюємо як sparse');
  }
}

export async function ensureIndexes(db: Db): Promise<void> {
  try {
    await dropDenseEmailIndex(db);
  } catch (err) {
    logger.error('Не вдалося оновити індекс пошти', { message: (err as Error).message });
  }

  const results = await Promise.allSettled([
    db.collection('user').createIndexes([
      { key: { email: 1 }, unique: true, sparse: true },
      { key: { phoneNumber: 1 }, unique: true },
      // sparse — бо clientId є далеко не в кожного акаунта, а unique не дає
      // привʼязати одну картку клієнта до двох різних акаунтів.
      { key: { clientId: 1 }, unique: true, sparse: true },
    ]),
    db.collection('order').createIndexes([
      { key: { groomerId: 1, scheduledAt: 1 } },
      { key: { clientId: 1 } },
      { key: { petId: 1, status: 1 } },
    ]),
    db.collection('pet').createIndexes([
      { key: { userId: 1 } },
      { key: { userId: 1, archivedAt: 1 } },
    ]),
    db.collection(OTP_COLLECTION).createIndexes([
      { key: { userId: 1, createdAt: -1 } },
      { key: { phone: 1, createdAt: -1 } },
      { key: { ip: 1, createdAt: -1 } },
      { key: { createdAt: 1 }, expireAfterSeconds: OTP_RETENTION_SEC },
    ]),
    db.collection(SCHEDULE_COLLECTION).createIndexes([{ key: { groomerId: 1 }, unique: true }]),
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
