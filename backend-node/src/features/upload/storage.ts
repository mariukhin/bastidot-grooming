import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { DeleteObjectsCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

import { config } from '../../shared/config.ts';
import { logger } from '../../shared/logger.ts';

export interface Storage {
  readonly kind: 'r2' | 'local';
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  remove(keys: string[]): Promise<void>;
  publicUrl(key: string): string;
  /** Зворотне перетворення: з публічного URL дістати ключ, або null для чужого URL. */
  keyFromUrl(url: string): string | null;
}

function baseUrl(): string {
  return config.r2PublicUrl.replace(/\/$/, '');
}

function sharedKeyFromUrl(url: string): string | null {
  const base = baseUrl();
  if (!base || !url.startsWith(`${base}/`)) return null;
  return url.slice(base.length + 1);
}

function createR2Storage(): Storage {
  const client = new S3Client({
    region: 'auto',
    endpoint: `https://${config.r2AccountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.r2AccessKeyId,
      secretAccessKey: config.r2SecretAccessKey,
    },
  });

  return {
    kind: 'r2',

    async put(key, body, contentType) {
      await client.send(
        new PutObjectCommand({
          Bucket: config.r2Bucket,
          Key: key,
          Body: body,
          ContentType: contentType,
          // Файли іменовані за uuid і ніколи не переписуються — кешуємо назавжди.
          CacheControl: 'public, max-age=31536000, immutable',
        })
      );
    },

    async remove(keys) {
      if (keys.length === 0) return;
      await client.send(
        new DeleteObjectsCommand({
          Bucket: config.r2Bucket,
          Delete: { Objects: keys.map((Key) => ({ Key })) },
        })
      );
    },

    publicUrl: (key) => `${baseUrl()}/${key}`,
    keyFromUrl: sharedKeyFromUrl,
  };
}

/**
 * Запасне сховище для розробки: кладе файли в .uploads/ і віддає їх через
 * /uploads. Без нього локально не пройти жодного сценарію із фото, бо ключі R2
 * зʼявляться лише на проді.
 */
function createLocalStorage(): Storage {
  const root = path.resolve(process.cwd(), '.uploads');

  return {
    kind: 'local',

    async put(key, body) {
      const file = path.join(root, key);
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, body);
    },

    async remove(keys) {
      await Promise.all(keys.map((key) => rm(path.join(root, key), { force: true })));
    },

    publicUrl: (key) => `${baseUrl()}/${key}`,
    keyFromUrl: sharedKeyFromUrl,
  };
}

export const storage: Storage = config.r2Configured ? createR2Storage() : createLocalStorage();

export const LOCAL_UPLOAD_DIR = path.resolve(process.cwd(), '.uploads');

if (!config.r2Configured) {
  logger.warn('R2 не налаштовано — фото зберігаються локально в .uploads', {
    publicUrl: baseUrl(),
  });
}
