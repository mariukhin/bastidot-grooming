import { randomUUID } from 'node:crypto';
import { ObjectId } from 'mongodb';
import type { Db } from 'mongodb';

import { USER_COLLECTION, type User } from '../../shared/user.ts';
import { logger } from '../../shared/logger.ts';
import { PET_COLLECTION, type Pet } from '../pet/types.ts';
import { findClientId } from '../pet/account-pets.ts';
import { processImage } from './image.ts';
import { storage } from './storage.ts';
import { UploadError, type StoredImage, type UploadScope } from './types.ts';

function keyPrefix(scope: UploadScope, ownerId: string): string {
  return scope === 'pet' ? `pets/${ownerId}` : `users/${ownerId}`;
}

/** Обидва розміри одного фото: за повним URL завжди знаходиться і прев'ю. */
function siblingKeys(url: string): string[] {
  const key = storage.keyFromUrl(url);
  if (!key) return [];

  const base = key.replace(/-(full|preview)\.webp$/, '');
  return base === key ? [key] : [`${base}-full.webp`, `${base}-preview.webp`];
}

async function removeQuietly(url: string | undefined | null): Promise<void> {
  const keys = url ? siblingKeys(url) : [];
  if (keys.length === 0) return;

  try {
    await storage.remove(keys);
  } catch (err) {
    // Фото вже замінене, і підвисати через прибирання старого не варто.
    logger.error('Не вдалося видалити старі файли фото', {
      keys,
      message: err instanceof Error ? err.message : String(err),
    });
  }
}

async function store(
  scope: UploadScope,
  ownerId: string,
  file: Buffer,
  mimetype: string
): Promise<StoredImage> {
  const images = await processImage(file, mimetype);
  const id = randomUUID();
  const prefix = keyPrefix(scope, ownerId);

  const stored = await Promise.all(
    images.map(async (image) => {
      const key = `${prefix}/${id}-${image.size}.webp`;
      await storage.put(key, image.body, image.contentType);
      return [image.size, storage.publicUrl(key)] as const;
    })
  );

  const bySize = Object.fromEntries(stored);
  return { url: bySize.full!, previewUrl: bySize.preview! };
}

export async function uploadPetPhoto(
  db: Db,
  userId: string,
  petId: string,
  file: Buffer,
  mimetype: string
): Promise<StoredImage> {
  if (!ObjectId.isValid(petId)) {
    throw new UploadError('Улюбленця не знайдено', 404, 'no-pet');
  }

  const clientId = await findClientId(db, userId);
  if (!clientId) {
    throw new UploadError('Підтвердіть номер телефону', 403, 'no-client');
  }

  const pets = db.collection<Pet>(PET_COLLECTION);
  // Чужий улюбленець має давати 404, а не 403: інакше по відповіді можна
  // перебрати, які id існують.
  const pet = await pets.findOne({ _id: new ObjectId(petId), userId: clientId });
  if (!pet) {
    throw new UploadError('Улюбленця не знайдено', 404, 'no-pet');
  }

  const image = await store('pet', petId, file, mimetype);

  await pets.updateOne(
    { _id: pet._id! },
    { $set: { photoUrl: image.url, photoPreviewUrl: image.previewUrl } }
  );
  await removeQuietly(pet.photoUrl);

  return image;
}

export async function uploadAvatar(
  db: Db,
  userId: string,
  file: Buffer,
  mimetype: string
): Promise<StoredImage> {
  const users = db.collection<User>(USER_COLLECTION);
  const _id = new ObjectId(userId);
  const user = await users.findOne({ _id });

  if (!user) {
    throw new UploadError('Користувача не знайдено', 404, 'no-user');
  }

  const image = await store('avatar', userId, file, mimetype);

  await users.updateOne(
    { _id },
    { $set: { photoUrl: image.url, photoPreviewUrl: image.previewUrl } }
  );
  // Фото з Google лежить не в нас — keyFromUrl поверне null, і ми його не чіпаємо.
  await removeQuietly(user.photoUrl);

  return image;
}
