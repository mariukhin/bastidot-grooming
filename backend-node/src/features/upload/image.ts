import sharp from 'sharp';

import { ALLOWED_MIME, MAX_UPLOAD_BYTES, SIZE_WIDTH, UploadError, type ImageSize } from './types.ts';

export interface ProcessedImage {
  size: ImageSize;
  body: Buffer;
  contentType: string;
}

/**
 * Готує два webp із одного завантаженого файлу.
 *
 * sharp за замовчуванням не переносить метадані у вихідний файл, тож EXIF —
 * разом із геоміткою, де знято фото, — зникає сам собою. Орієнтацію з нього
 * застосовуємо до пікселів заздалегідь, інакше без EXIF фото ляже набік.
 */
export async function processImage(file: Buffer, mimetype: string): Promise<ProcessedImage[]> {
  if (!ALLOWED_MIME.includes(mimetype)) {
    throw new UploadError('Підтримуємо jpeg, png, webp і heic', 415, 'bad-type');
  }
  if (file.length > MAX_UPLOAD_BYTES) {
    throw new UploadError('Файл завеликий — до 10 МБ', 413, 'too-large');
  }

  let meta;
  try {
    meta = await sharp(file).metadata();
  } catch {
    // Складання sharp не завжди вміє декодувати HEIC — тоді підказуємо вихід,
    // а не лишаємо людину з «щось пішло не так».
    const heic = mimetype === 'image/heic' || mimetype === 'image/heif';
    throw new UploadError(
      heic ? 'Не вдалося прочитати HEIC. Збережіть фото як JPEG' : 'Не вдалося прочитати зображення',
      400,
      'bad-image'
    );
  }

  if (!meta.width || !meta.height) {
    throw new UploadError('Не вдалося прочитати зображення', 400, 'bad-image');
  }

  const sizes: ImageSize[] = ['full', 'preview'];

  return await Promise.all(
    sizes.map(async (size) => ({
      size,
      contentType: 'image/webp',
      body: await sharp(file)
        .rotate()
        .resize({ width: SIZE_WIDTH[size], withoutEnlargement: true })
        .webp({ quality: size === 'preview' ? 72 : 80 })
        .toBuffer(),
    }))
  );
}
