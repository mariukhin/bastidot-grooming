import { Router } from 'express';
import type { Request, Response } from 'express';
import type { Db } from 'mongodb';

import { requireRole } from '../../shared/auth-middleware.ts';
import { GroomerDayError, getGroomerOrder, listGroomerDay, setOrderStatus } from './groomer-day.ts';
import type { OrderStatus } from './types.ts';

export function createGroomerOrdersRouter(db: Db): Router {
  const router = Router();

  const route =
    (handler: (userId: string, req: Request, res: Response) => Promise<void>) =>
    async (req: Request, res: Response) => {
      try {
        await handler(req.userId!, req, res);
      } catch (err) {
        if (err instanceof GroomerDayError) {
          res.status(err.status).json({ error: err.message });
          return;
        }
        throw err;
      }
    };

  router.use('/groomer/orders', requireRole('groomer'));

  // GET /staff/groomer/orders?date=YYYY-MM-DD
  router.get(
    '/groomer/orders',
    route(async (userId, req, res) => {
      const date = typeof req.query.date === 'string' ? req.query.date : '';
      res.json(await listGroomerDay(db, userId, date));
    })
  );

  // GET /staff/groomer/orders/:id
  router.get(
    '/groomer/orders/:id',
    route(async (userId, req, res) => {
      res.json(await getGroomerOrder(db, userId, String(req.params.id)));
    })
  );

  // PATCH /staff/groomer/orders/:id/status
  router.patch(
    '/groomer/orders/:id/status',
    route(async (userId, req, res) => {
      const body = (req.body ?? {}) as Record<string, unknown>;
      const note = typeof body.groomerNote === 'string' ? body.groomerNote.trim() : undefined;

      res.json(
        await setOrderStatus(db, userId, String(req.params.id), body.status as OrderStatus, note)
      );
    })
  );

  return router;
}
