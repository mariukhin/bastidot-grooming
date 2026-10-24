import { Router } from 'express';
import type { Request, Response } from 'express';
import type { Db } from 'mongodb';

import { requireRole } from '../../shared/auth-middleware.ts';
import {
  getSchedule,
  parseException,
  parseWeekly,
  removeException,
  saveException,
  saveWeekly,
  scheduleForDate,
} from './service.ts';
import { dateInZone } from './time.ts';
import { ScheduleError } from './types.ts';

export function createScheduleRouter(db: Db): Router {
  const router = Router();

  const route =
    (handler: (req: Request, res: Response) => Promise<void>) =>
    async (req: Request, res: Response) => {
      try {
        await handler(req, res);
      } catch (err) {
        if (err instanceof ScheduleError) {
          res.status(err.status).json({ error: err.message, code: err.code });
          return;
        }
        throw err;
      }
    };

  // GET /staff/schedule?date=YYYY-MM-DD — робочі інтервали всіх грумерів на день.
  router.get(
    '/schedule',
    route(async (req, res) => {
      const date = typeof req.query.date === 'string' ? req.query.date : dateInZone(new Date());
      res.json({ date, groomers: await scheduleForDate(db, date) });
    })
  );

  // GET /staff/schedule/:groomerId — шаблон і винятки одного грумера.
  router.get(
    '/schedule/:groomerId',
    route(async (req, res) => {
      const schedule = await getSchedule(db, String(req.params.groomerId));
      res.json({
        groomerId: schedule.groomerId.toHexString(),
        weekly: schedule.weekly,
        exceptions: [...schedule.exceptions].sort((a, b) => a.date.localeCompare(b.date)),
      });
    })
  );

  const adminOnly = requireRole('admin');

  router.put(
    '/schedule/:groomerId',
    adminOnly,
    route(async (req, res) => {
      const weekly = parseWeekly((req.body as { weekly?: unknown } | null)?.weekly);
      await saveWeekly(db, String(req.params.groomerId), weekly);
      res.json({ ok: true, weekly });
    })
  );

  router.put(
    '/schedule/:groomerId/exceptions/:date',
    adminOnly,
    route(async (req, res) => {
      const exception = parseException(String(req.params.date), req.body);
      await saveException(db, String(req.params.groomerId), exception);
      res.json({ ok: true, exception });
    })
  );

  router.delete(
    '/schedule/:groomerId/exceptions/:date',
    adminOnly,
    route(async (req, res) => {
      const removed = await removeException(db, String(req.params.groomerId), String(req.params.date));
      if (!removed) {
        res.status(404).json({ error: 'Винятку на цю дату немає', code: 'no-exception' });
        return;
      }
      res.status(204).end();
    })
  );

  return router;
}
