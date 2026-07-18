import { Router } from 'express';
import type { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import type { Db } from 'mongodb';
import OrderService from './service.ts';
import type { Order, BusySlot, CreateOrderInput } from './types.ts';

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
      res.status(201).json(toOrderDTO(order));
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

  return router;
}
