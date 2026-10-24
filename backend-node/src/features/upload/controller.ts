import { Router } from 'express';
import type { Request, Response } from 'express';
import type { Db } from 'mongodb';
import multer from 'multer';

import { uploadAvatar, uploadPetPhoto } from './service.ts';
import { ALLOWED_MIME, MAX_UPLOAD_BYTES, UploadError } from './types.ts';

// Файл тримаємо в памʼяті: sharp однаково читає його цілком, а 10 МБ стеля
// не дає роздути процес.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME.includes(file.mimetype)) {
      cb(null, true);
      return;
    }
    cb(new UploadError('Підтримуємо jpeg, png, webp і heic', 415, 'bad-type'));
  },
});

export function createUploadRouter(db: Db): Router {
  const router = Router();

  router.post('/uploads', (req: Request, res: Response) => {
    upload.single('file')(req, res, async (err: unknown) => {
      if (err) {
        if (err instanceof UploadError) {
          res.status(err.status).json({ error: err.message, code: err.code });
          return;
        }
        const tooLarge = err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE';
        res.status(tooLarge ? 413 : 400).json({
          error: tooLarge ? 'Файл завеликий — до 10 МБ' : 'Не вдалося прийняти файл',
          code: tooLarge ? 'too-large' : 'bad-upload',
        });
        return;
      }

      if (!req.userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const file = req.file;
      if (!file) {
        res.status(400).json({ error: 'Додайте файл зображення', code: 'no-file' });
        return;
      }

      const body = req.body as Record<string, unknown>;
      const scope = body.scope === 'avatar' ? 'avatar' : 'pet';

      try {
        const image =
          scope === 'avatar'
            ? await uploadAvatar(db, req.userId, file.buffer, file.mimetype)
            : await uploadPetPhoto(
                db,
                req.userId,
                typeof body.petId === 'string' ? body.petId : '',
                file.buffer,
                file.mimetype
              );

        res.status(201).json(image);
      } catch (error) {
        if (error instanceof UploadError) {
          res.status(error.status).json({ error: error.message, code: error.code });
          return;
        }
        throw error;
      }
    });
  });

  return router;
}
