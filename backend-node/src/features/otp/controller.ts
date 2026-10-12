import { Router } from 'express';
import type { Request, Response } from 'express';
import type { Db } from 'mongodb';

import { OtpError, requestCode, verifyCode } from './service.ts';
import type { OtpChannel } from './types.ts';

/**
 * Адреса запитувача для ліміту.
 *
 * За проксі (Fly, Vercel) справжній IP приходить у X-Forwarded-For; беремо
 * перший елемент — решту підставляють проміжні вузли.
 */
function clientIp(req: Request): string | undefined {
  const forwarded = req.headers['x-forwarded-for'];
  const raw = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  const first = raw?.split(',')[0]?.trim();
  return first || req.socket.remoteAddress || undefined;
}

export function createOtpRouter(db: Db): Router {
  const router = Router();

  const route =
    (handler: (userId: string, req: Request, res: Response) => Promise<void>) =>
    async (req: Request, res: Response) => {
      if (!req.userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      try {
        await handler(req.userId, req, res);
      } catch (err) {
        if (err instanceof OtpError) {
          res.status(err.status).json({
            error: err.message,
            code: err.code,
            ...(err.retryAfterSec ? { retryAfterSec: err.retryAfterSec } : {}),
          });
          return;
        }
        throw err;
      }
    };

  // POST /protected/phone/code — надіслати код. Номер за замовчуванням свій:
  // передавати чужий у тілі безглуздо, але поле лишаємо для зміни номера.
  router.post(
    '/phone/code',
    route(async (userId, req, res) => {
      const body = (req.body ?? {}) as Record<string, unknown>;
      const phone = typeof body.phone === 'string' ? body.phone : '';
      const channel: OtpChannel | undefined = body.channel === 'sms' ? 'sms' : undefined;

      const result = await requestCode(db, userId, phone, { ip: clientIp(req), channel });

      res.json({
        channel: result.channel,
        phone: result.phone,
        expiresAt: result.expiresAt.toISOString(),
        resendAfterSec: result.resendAfterSec,
      });
    })
  );

  // POST /protected/phone/verify
  router.post(
    '/phone/verify',
    route(async (userId, req, res) => {
      const body = (req.body ?? {}) as Record<string, unknown>;
      const result = await verifyCode(db, userId, String(body.code ?? ''));

      res.json({ phone: result.phone, outcome: result.outcome });
    })
  );

  return router;
}
