import { Router } from 'express';
import type { Request, Response } from 'express';
import type { Db } from 'mongodb';

import {
  addException,
  describeExceptions,
  getSchedule,
  parseException,
  parseWeekly,
  removeException,
  saveWeekly,
  scheduleForDate,
  setOnlineBooking,
  type ScheduleActor,
} from './service.ts';
import { dateInZone } from './time.ts';
import { ScheduleError } from './types.ts';

/**
 * Маршрути графіка під /staff (requireAuth + роль admin|groomer уже перевірені).
 *
 * :groomerId може бути «me» — тоді це той, чий токен. Грумер змінює лише свій
 * графік (перевірка в service.ts), адмін — будь-чий.
 */
export function createScheduleRouter(db: Db): Router {
  const router = Router();

  const actorOf = (req: Request): ScheduleActor => ({
    id: req.userId!,
    role: req.userRole === 'admin' ? 'admin' : 'groomer',
  });

  const groomerIdOf = (req: Request): string => {
    const raw = String(req.params.groomerId ?? '');
    return raw === 'me' ? req.userId! : raw;
  };

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

  // GET /staff/schedule/:groomerId — шаблон, винятки і прапорець онлайн-запису.
  router.get(
    '/schedule/:groomerId',
    route(async (req, res) => {
      const schedule = await getSchedule(db, groomerIdOf(req));
      const exceptions = await describeExceptions(db, schedule);
      const pending = schedule.pendingWeekly;

      res.json({
        groomerId: schedule.groomerId.toHexString(),
        name: schedule.name,
        onlineBooking: schedule.onlineBooking,
        weekly: schedule.weekly,
        // Збережений шаблон, що набуде чинності з effectiveFrom (наступний понеділок).
        pendingWeekly: pending
          ? { effectiveFrom: pending.effectiveFrom, weekly: pending.weekly }
          : null,
        exceptions: exceptions.map(({ changedBy, changedAt, ...rest }) => ({
          ...rest,
          changedBy: changedBy ? changedBy.toHexString() : null,
          changedAt: changedAt ? changedAt.toISOString() : null,
        })),
      });
    })
  );

  // PUT /staff/schedule/:groomerId  { weekly: [...] }
  router.put(
    '/schedule/:groomerId',
    route(async (req, res) => {
      const weekly = parseWeekly((req.body as { weekly?: unknown } | null)?.weekly);
      const result = await saveWeekly(db, actorOf(req), groomerIdOf(req), weekly);
      res.json({ ok: true, weekly, ...result });
    })
  );

  // POST /staff/schedule/:groomerId/exceptions  { type, dateFrom, dateTo?, from?, to?, note? }
  router.post(
    '/schedule/:groomerId/exceptions',
    route(async (req, res) => {
      const input = parseException(req.body);
      const { exception, affectedOrders } = await addException(
        db,
        actorOf(req),
        groomerIdOf(req),
        input
      );
      res.status(201).json({
        ok: true,
        exception: {
          ...exception,
          changedBy: exception.changedBy?.toHexString() ?? null,
          changedAt: exception.changedAt?.toISOString() ?? null,
        },
        affectedOrders,
      });
    })
  );

  // DELETE /staff/schedule/:groomerId/exceptions/:id
  router.delete(
    '/schedule/:groomerId/exceptions/:id',
    route(async (req, res) => {
      const result = await removeException(
        db,
        actorOf(req),
        groomerIdOf(req),
        String(req.params.id)
      );
      if (!result) {
        res.status(404).json({ error: 'Такого винятку немає', code: 'no-exception' });
        return;
      }
      res.json({ ok: true, ...result });
    })
  );

  // PUT /staff/schedule/:groomerId/online-booking  { onlineBooking: boolean } — лише адмін.
  router.put(
    '/schedule/:groomerId/online-booking',
    route(async (req, res) => {
      const value = (req.body as { onlineBooking?: unknown } | null)?.onlineBooking;
      if (typeof value !== 'boolean') {
        res.status(400).json({ error: 'onlineBooking має бути true або false', code: 'bad-flag' });
        return;
      }
      await setOnlineBooking(db, actorOf(req), groomerIdOf(req), value);
      res.json({ ok: true, onlineBooking: value });
    })
  );

  return router;
}
