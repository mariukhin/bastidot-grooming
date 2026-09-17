import { readFile } from 'node:fs/promises';
import { EJSON } from 'bson';
import type { Document } from 'mongodb';
import { connectToDatabase, closeDatabase } from '../shared/db.ts';
import { logger } from '../shared/logger.ts';
import { CLIENT_COLLECTION, type Client } from '../shared/client.ts';

const args = process.argv.slice(2);
const filePath = args.find((a) => !a.startsWith('--'));
const apply = args.includes('--apply');

if (!filePath) {
  logger.error('Вкажіть файл: npm run client:apply -- client-calls.json [--apply]');
  process.exit(1);
}

const docs = EJSON.parse(await readFile(filePath, 'utf8'), { relaxed: false }) as Document[];
if (!Array.isArray(docs) || docs.length === 0) {
  logger.error('Файл має містити непорожній масив документів');
  process.exit(1);
}

const db = await connectToDatabase();

try {
  const col = db.collection<Client>(CLIENT_COLLECTION);
  const out = process.stdout;

  out.write('\n');
  for (const doc of docs) {
    const { _id, ...fields } = doc;
    if (!_id) {
      throw new Error('У документі немає _id — оновлювати нема що');
    }
    const existing = await col.findOne({ _id }, { projection: { name: 1, phone: 1 } });
    const label = existing ? `${existing.name} (${existing.phone})` : 'НОВИЙ ДОКУМЕНТ';
    out.write(`  ${String(_id)}  ${label}\n`);
    out.write(`     поля: ${Object.keys(fields).join(', ')}\n`);
  }

  out.write(`\nдокументів: ${docs.length}\n`);

  if (!apply) {
    out.write('Сухий прогін — база не змінювалась. Щоб записати, додайте --apply\n');
  } else {
    const result = await col.bulkWrite(
      docs.map((doc) => {
        const { _id, ...fields } = doc;
        return { updateOne: { filter: { _id }, update: { $set: fields }, upsert: true } };
      })
    );
    logger.info('Записано', {
      matched: result.matchedCount,
      modified: result.modifiedCount,
      upserted: result.upsertedCount,
    });
  }
} catch (error) {
  logger.error('Не вдалося застосувати файл', {
    message: error instanceof Error ? error.message : String(error),
  });
  process.exitCode = 1;
} finally {
  await closeDatabase();
}
