import { Router } from 'express';
import type { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import type { Db } from 'mongodb';
import OrderService from './service.ts';
import { notifyNewOrder, notifyOrderChanged } from './notification.ts';
import { logger } from '../../shared/logger.ts';
import { config } from '../../shared/config.ts';
import {
  OrderActionFailure,
  type Order,
  type BusySlot,
  type CreateOrderInput,
  type OrderActionError,
} from './types.ts';

function toOrderDTO(order: Order) {
  return {
    id: order._id ? order._id.toHexString() : '',
    clientId: order.clientId.toHexString(),
    petId: order.petId.toHexString(),
    groomerId: order.groomerId.toHexString(),
    createdAt: order.createdAt.toISOString(),
    scheduledAt: order.scheduledAt.toISOString(),
    durationMinutes: order.durationMinutes,
    status: order.status,
    statusHistory: order.statusHistory.map((h) => ({
      status: h.status,
      changedAt: h.changedAt.toISOString(),
      changedBy: h.changedBy?.toHexString(),
    })),
    comment: order.comment,
    serviceIds: order.serviceIds.map((id) => id.toHexString()),
  };
}

// cancelToken віддаємо рівно один раз — у відповідь тому, хто щойно створив
// запис. У решті відповідей його немає, інакше він перестав би бути секретом.
function toCreatedOrderDTO(order: Order) {
  return { ...toOrderDTO(order), cancelToken: order.cancelToken ?? null };
}

const ACTION_STATUS: Record<OrderActionError, number> = {
  'not-found': 404,
  forbidden: 403,
  'already-cancelled': 409,
  'too-late': 409,
  'slot-taken': 409,
};

const ACTION_MESSAGE: Record<OrderActionError, string> = {
  'not-found': 'Запис не знайдено',
  forbidden: 'Немає доступу до цього запису',
  'already-cancelled': 'Запис уже скасовано',
  'too-late': `Змінити запис онлайн можна не пізніше ніж за ${config.orderSelfServiceCutoffHours} год до візиту. Зателефонуйте нам`,
  'slot-taken': 'Цей час щойно зайняли. Оберіть інший',
};

function respondWithActionError(res: Response, err: unknown): void {
  if (err instanceof OrderActionFailure) {
    res.status(ACTION_STATUS[err.code]).json({ error: ACTION_MESSAGE[err.code], code: err.code });
    return;
  }
  res.status(400).json({ error: err instanceof Error ? err.message : 'Не вдалося змінити запис' });
}

function readToken(body: unknown): string {
  if (typeof body !== 'object' || body === null) return '';
  const token = (body as Record<string, unknown>).token;
  return typeof token === 'string' ? token : '';
}

function toBusySlotDTO(slot: BusySlot) {
  return {
    scheduledAt: slot.scheduledAt.toISOString(),
    durationMinutes: slot.durationMinutes,
  };
}

function validateCreateOrder(body: unknown): { error: string } | { input: CreateOrderInput } {
  if (typeof body !== 'object' || body === null) {
    return { error: 'Request body must be an object' };
  }

  const b = body as Record<string, unknown>;

  if (typeof b.clientName !== 'string' || b.clientName.trim() === '') {
    return { error: "Ім'я клієнта обов'язкове" };
  }
  if (typeof b.clientPhone !== 'string' || b.clientPhone.trim() === '') {
    return { error: "Телефон клієнта обов'язковий" };
  }
  if (typeof b.petName !== 'string' || b.petName.trim() === '') {
    return { error: "Ім'я улюбленця обов'язкове" };
  }
  if (typeof b.groomerId !== 'string' || b.groomerId.trim() === '') {
    return { error: "Грумер обов'язковий" };
  }
  if (typeof b.scheduledAt !== 'string' || Number.isNaN(Date.parse(b.scheduledAt))) {
    return { error: 'Дата та час візиту обовʼязкові й мають бути валідними' };
  }
  if (typeof b.durationMinutes !== 'number' || b.durationMinutes <= 0) {
    return { error: 'durationMinutes має бути додатним числом' };
  }

  // Проходимо валідацію — збираємо типізований input з опційними полями.
  return {
    input: {
      clientName: b.clientName.trim(),
      clientPhone: b.clientPhone.trim(),
      clientEmail: typeof b.clientEmail === 'string' ? b.clientEmail : undefined,
      petName: b.petName.trim(),
      petAge: typeof b.petAge === 'number' ? b.petAge : undefined,
      petWeight: typeof b.petWeight === 'number' ? b.petWeight : undefined,
      petPhotoUrl: typeof b.petPhotoUrl === 'string' ? b.petPhotoUrl : undefined,
      petComment: typeof b.petComment === 'string' ? b.petComment : undefined,
      petBreedId: typeof b.petBreedId === 'string' && b.petBreedId !== '' ? b.petBreedId : undefined,
      groomerId: b.groomerId.trim(),
      scheduledAt: b.scheduledAt,
      durationMinutes: b.durationMinutes,
      comment: typeof b.comment === 'string' ? b.comment : undefined,
      serviceIds: Array.isArray(b.serviceIds)
        ? b.serviceIds.filter((s): s is string => typeof s === 'string')
        : undefined,
    },
  };
}

export function createOrderRouter(db: Db): Router {
  const router = Router();

  // POST /order
  router.post('/', async (req: Request, res: Response) => {
    const result = validateCreateOrder(req.body);
    if ('error' in result) {
      res.status(400).json({ error: result.error });
      return;
    }

    // Помилки createOrder (грумер не знайдений, не грумер, кривий serviceId)
    // — це помилки вводу, тому мапимо на 400, а не даємо їм стати 500.
    try {
      const order = await OrderService.createOrder(db, result.input);
      res.status(201).json(toCreatedOrderDTO(order));

      // Запис уже збережений, тож відповідь клієнту не чекає на Telegram:
      // недоступний бот не має ні гальмувати форму, ні ламати запис.
      notifyNewOrder(db, order).catch((err: unknown) => {
        logger.error('Failed to send new-order notification', {
          orderId: order._id?.toHexString(),
          error: err instanceof Error ? err.message : String(err),
        });
      });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to create order' });
    }
  });

  // GET /order/busy-slots?groomerId=&from=YYYY-MM-DD&to=YYYY-MM-DD
  router.get('/busy-slots', async (req: Request, res: Response) => {
    const { groomerId, from, to } = req.query;

    if (typeof groomerId !== 'string' || !ObjectId.isValid(groomerId)) {
      res.status(400).json({ error: 'valid groomerId is required' });
      return;
    }
    const isDate = (v: unknown): v is string =>
      typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
    if (!isDate(from) || !isDate(to)) {
      res.status(400).json({ error: 'from and to must be YYYY-MM-DD' });
      return;
    }

    const slots = await OrderService.fetchBusySlots(db, groomerId, from, to);
    res.json(slots.map(toBusySlotDTO));
  });

  // POST /order/:id/cancel  { token }
  router.post('/:id/cancel', async (req: Request, res: Response) => {
    try {
      const order = await OrderService.cancelOrder(db, String(req.params.id ?? ''), readToken(req.body));
      res.json(toOrderDTO(order));

      notifyOrderChanged(db, order).catch((err: unknown) => {
        logger.error('Failed to send cancel notification', {
          orderId: order._id?.toHexString(),
          error: err instanceof Error ? err.message : String(err),
        });
      });
    } catch (err) {
      respondWithActionError(res, err);
    }
  });

  // PATCH /order/:id/schedule  { token, scheduledAt, durationMinutes? }
  router.patch('/:id/schedule', async (req: Request, res: Response) => {
    const body = (req.body ?? {}) as Record<string, unknown>;

    if (typeof body.scheduledAt !== 'string' || Number.isNaN(Date.parse(body.scheduledAt))) {
      res.status(400).json({ error: 'Новий час візиту обовʼязковий і має бути валідним' });
      return;
    }
    if (body.durationMinutes !== undefined && typeof body.durationMinutes !== 'number') {
      res.status(400).json({ error: 'durationMinutes має бути числом' });
      return;
    }

    try {
      const { order, previousAt } = await OrderService.rescheduleOrder(
        db,
        String(req.params.id ?? ''),
        readToken(body),
        { scheduledAt: body.scheduledAt, durationMinutes: body.durationMinutes }
      );
      res.json(toOrderDTO(order));

      notifyOrderChanged(db, order, previousAt).catch((err: unknown) => {
        logger.error('Failed to send reschedule notification', {
          orderId: order._id?.toHexString(),
          error: err instanceof Error ? err.message : String(err),
        });
      });
    } catch (err) {
      respondWithActionError(res, err);
    }
  });

  return router;
}
