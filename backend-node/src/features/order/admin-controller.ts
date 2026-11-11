import { Router } from 'express';
import type { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import type { Db } from 'mongodb';

import { requireRole } from '../../shared/auth-middleware.ts';
import { logger } from '../../shared/logger.ts';
import { notifyOrderChanged } from './notification.ts';
import { listAdminEvents, remindAboutOrder } from './events.ts';
import { createOrderAsAdmin, searchClients, type AdminOrderInput } from './admin-create.ts';
import { ORDER_COLLECTION, type Order } from './types.ts';
import {
  AdminError,
  adminStats,
  cancelAsAdmin,
  confirmOrder,
  listAdminDay,
  reassignGroomer,
  rescheduleAsAdmin,
} from './admin-day.ts';

export function createAdminOrdersRouter(db: Db): Router {
  const router = Router();

  router.use('/admin', requireRole('admin'));

  const route =
    (handler: (adminId: string, req: Request, res: Response) => Promise<void>) =>
    async (req: Request, res: Response) => {
      try {
        await handler(req.userId!, req, res);
      } catch (err) {
        if (err instanceof AdminError) {
          res.status(err.status).json({ error: err.message, code: err.code });
          return;
        }
        throw err;
      }
    };

  /** Салон дізнається про зміну тим самим шляхом, що й при зміні з кабінету. */
  const notify = (orderId: string, previousAt: Date | null = null) => {
    void db
      .collection<Order>(ORDER_COLLECTION)
      .findOne({ _id: new ObjectId(orderId) })
      .then((order) => (order ? notifyOrderChanged(db, order, previousAt) : undefined))
      .catch((err: unknown) => {
        logger.error('Не вдалося надіслати сповіщення про зміну запису', {
          orderId,
          error: err instanceof Error ? err.message : String(err),
        });
      });
  };

  const q = (req: Request, name: string) =>
    typeof req.query[name] === 'string' ? (req.query[name] as string) : '';

  router.get(
    '/admin/orders',
    route(async (_adminId, req, res) => {
      res.json(await listAdminDay(db, q(req, 'date'), q(req, 'groomerId')));
    })
  );

  router.get(
    '/admin/clients',
    route(async (_adminId, req, res) => {
      res.json(await searchClients(db, q(req, 'q')));
    })
  );

  router.post(
    '/admin/orders',
    route(async (adminId, req, res) => {
      const body = (req.body ?? {}) as unknown as AdminOrderInput;
      res.status(201).json(await createOrderAsAdmin(db, adminId, body));
    })
  );

  router.get(
    '/admin/events',
    route(async (_adminId, _req, res) => {
      res.json(await listAdminEvents(db));
    })
  );

  router.post(
    '/admin/orders/:id/remind',
    route(async (_adminId, req, res) => {
      res.json(await remindAboutOrder(db, String(req.params.id)));
    })
  );

  router.get(
    '/admin/stats',
    route(async (_adminId, req, res) => {
      res.json(await adminStats(db, q(req, 'date')));
    })
  );

  router.post(
    '/admin/orders/:id/confirm',
    route(async (adminId, req, res) => {
      const dto = await confirmOrder(db, adminId, String(req.params.id));
      notify(dto.id);
      res.json(dto);
    })
  );

  router.post(
    '/admin/orders/:id/cancel',
    route(async (adminId, req, res) => {
      const dto = await cancelAsAdmin(db, adminId, String(req.params.id));
      notify(dto.id);
      res.json(dto);
    })
  );

  router.patch(
    '/admin/orders/:id/schedule',
    route(async (adminId, req, res) => {
      const body = (req.body ?? {}) as Record<string, unknown>;
      const before = await db
        .collection<Order>(ORDER_COLLECTION)
        .findOne({ _id: ObjectId.isValid(String(req.params.id)) ? new ObjectId(String(req.params.id)) : new ObjectId() });

      const dto = await rescheduleAsAdmin(
        db,
        adminId,
        String(req.params.id),
        String(body.scheduledAt ?? ''),
        body.durationMinutes
      );

      notify(dto.id, before?.scheduledAt ?? null);
      res.json(dto);
    })
  );

  router.patch(
    '/admin/orders/:id/groomer',
    route(async (adminId, req, res) => {
      const body = (req.body ?? {}) as Record<string, unknown>;
      const dto = await reassignGroomer(db, adminId, String(req.params.id), String(body.groomerId ?? ''));
      notify(dto.id);
      res.json(dto);
    })
  );

  return router;
}
