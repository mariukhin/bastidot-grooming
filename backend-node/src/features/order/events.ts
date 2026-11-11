import { ObjectId } from 'mongodb';
import type { Db } from 'mongodb';

import { USER_COLLECTION, type User } from '../../shared/user.ts';
import { CLIENT_COLLECTION, type Client } from '../../shared/client.ts';
import { PET_COLLECTION, type Pet } from '../pet/types.ts';
import { canSendTelegram, escapeHtml, sendTelegramMessage } from '../../shared/telegram.ts';
import { logger } from '../../shared/logger.ts';
import { config } from '../../shared/config.ts';
import { intervalsFor } from '../schedule/service.ts';
import { SCHEDULE_COLLECTION, type GroomerSchedule } from '../schedule/types.ts';
import { dateInZone, minutesOf } from '../schedule/time.ts';
import { AdminError } from './admin-day.ts';
import { hasConflict } from './service.ts';
import { ORDER_COLLECTION, type Order } from './types.ts';

export type AdminEventType = 'unassigned' | 'unconfirmed' | 'cancelled' | 'reminder';
export type AdminEventAction = 'assign' | 'confirm' | 'remind' | null;

export interface AdminEvent {
  /** Один запис може дати кілька подій, тож id складений. */
  id: string;
  type: AdminEventType;
  action: AdminEventAction;
  orderId: string;
  scheduledAt: string;
  durationMinutes: number;
  client: { name: string; phone: string };
  petName: string | null;
  groomer: { id: string; name: string } | null;
  /** Хто вільний на цей час — підказка для кнопки «Призначити». */
  suggestedGroomer: { id: string; name: string } | null;
}

/** Скасування показуємо лише поки слот свіжий: день по тому його вже не продати. */
const CANCELLED_WINDOW_HOURS = 24;

function minutesInZone(at: Date): number {
  const parts = new Intl.DateTimeFormat('uk-UA', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: config.timeZone,
  }).format(at);

  return minutesOf(parts.replace('.', ':'));
}

function cancelledAt(order: Order): Date | null {
  const entry = [...(order.statusHistory ?? [])]
    .reverse()
    .find((change) => change.status === 'cancelled');

  return entry?.changedAt ?? null;
}

/** Грумер, який у цей час працює за графіком і не має іншого візиту. */
async function suggestGroomer(
  db: Db,
  groomers: User[],
  schedules: Map<string, GroomerSchedule>,
  order: Order
): Promise<User | null> {
  const date = dateInZone(order.scheduledAt);
  const start = minutesInZone(order.scheduledAt);
  const end = start + order.durationMinutes;

  for (const groomer of groomers) {
    const id = groomer._id!.toHexString();
    const doc = schedules.get(id) ?? { weekly: [], exceptions: [] };
    const { intervals } = intervalsFor(doc, date);

    const worksThen = intervals.some(
      (interval) => minutesOf(interval.from) <= start && minutesOf(interval.to) >= end
    );
    if (!worksThen) continue;

    const busy = await hasConflict(
      db,
      groomer._id!,
      order.scheduledAt,
      order.durationMinutes,
      order._id!
    );
    if (!busy) return groomer;
  }

  return null;
}

export async function listAdminEvents(db: Db): Promise<{ count: number; events: AdminEvent[] }> {
  const now = new Date();
  const horizon = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  const cancelledSince = new Date(now.getTime() - CANCELLED_WINDOW_HOURS * 60 * 60 * 1000);
  const tomorrow = dateInZone(new Date(now.getTime() + 24 * 60 * 60 * 1000));

  const orders = await db
    .collection<Order>(ORDER_COLLECTION)
    .find({ scheduledAt: { $gte: now, $lt: horizon } })
    .sort({ scheduledAt: 1 })
    .toArray();

  if (orders.length === 0) return { count: 0, events: [] };

  const uniq = (ids: ObjectId[]) =>
    [...new Set(ids.map((id) => id.toHexString()))].map((id) => new ObjectId(id));

  const [clients, pets, groomers] = await Promise.all([
    db
      .collection<Client>(CLIENT_COLLECTION)
      .find({ _id: { $in: uniq(orders.map((o) => o.clientId)) } })
      .toArray(),
    db
      .collection<Pet>(PET_COLLECTION)
      .find({ _id: { $in: uniq(orders.map((o) => o.petId)) } }, { projection: { name: 1 } })
      .toArray(),
    db
      .collection<User>(USER_COLLECTION)
      .find({ isGroomer: true }, { projection: { username: 1, isGroomer: 1 } })
      .toArray(),
  ]);

  const scheduleDocs = await db
    .collection<GroomerSchedule>(SCHEDULE_COLLECTION)
    .find({ groomerId: { $in: groomers.map((g) => g._id!) } })
    .toArray();

  const clientById = new Map(clients.map((c) => [c._id!.toHexString(), c]));
  const petById = new Map(pets.map((p) => [p._id!.toHexString(), p]));
  const groomerById = new Map(groomers.map((g) => [g._id!.toHexString(), g]));
  const scheduleById = new Map(scheduleDocs.map((s) => [s.groomerId.toHexString(), s]));

  const events: AdminEvent[] = [];

  for (const order of orders) {
    const client = clientById.get(order.clientId.toHexString());
    const groomer = order.groomerId ? groomerById.get(order.groomerId.toHexString()) : undefined;

    const base = {
      orderId: order._id!.toHexString(),
      scheduledAt: order.scheduledAt.toISOString(),
      durationMinutes: order.durationMinutes,
      client: { name: client?.name ?? '', phone: client?.phone ?? '' },
      petName: petById.get(order.petId.toHexString())?.name ?? null,
      groomer: groomer ? { id: groomer._id!.toHexString(), name: groomer.username } : null,
      suggestedGroomer: null,
    };

    if (order.status === 'cancelled') {
      const at = cancelledAt(order);
      if (at && at >= cancelledSince) {
        events.push({ ...base, id: `cancelled:${base.orderId}`, type: 'cancelled', action: null });
      }
      continue;
    }

    // Запис без майстра: або «будь-який грумер», або майстер більше не працює.
    if (!groomer) {
      const free = await suggestGroomer(db, groomers, scheduleById, order);
      events.push({
        ...base,
        id: `unassigned:${base.orderId}`,
        type: 'unassigned',
        action: 'assign',
        suggestedGroomer: free ? { id: free._id!.toHexString(), name: free.username } : null,
      });
      continue;
    }

    if (!order.confirmedAt) {
      events.push({
        ...base,
        id: `unconfirmed:${base.orderId}`,
        type: 'unconfirmed',
        action: 'confirm',
      });
    }

    if (dateInZone(order.scheduledAt) === tomorrow && !order.remindedAt) {
      events.push({ ...base, id: `reminder:${base.orderId}`, type: 'reminder', action: 'remind' });
    }
  }

  return { count: events.length, events };
}

function reminderMessage(order: Order, client: Client | null, pet: Pet | null): string {
  const when = new Intl.DateTimeFormat('uk-UA', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: config.timeZone,
  }).format(order.scheduledAt);

  return [
    '🔔 <b>Нагадати про візит</b>',
    `${escapeHtml(client?.name ?? 'Клієнт')}${pet ? ` (${escapeHtml(pet.name)})` : ''}`,
    escapeHtml(client?.phone ?? ''),
    escapeHtml(when),
  ]
    .filter(Boolean)
    .join('\n');
}

/** Прямого каналу до клієнта в нас поки немає, тож нагадування летить
 *  у робочий чат — адміністратор дзвонить сам, як і з «сплячими» клієнтами. */
export async function remindAboutOrder(db: Db, orderId: string): Promise<{ remindedAt: string }> {
  if (!ObjectId.isValid(orderId)) {
    throw new AdminError('Запис не знайдено', 404, 'no-order');
  }

  const orders = db.collection<Order>(ORDER_COLLECTION);
  const order = await orders.findOne({ _id: new ObjectId(orderId) });

  if (!order) {
    throw new AdminError('Запис не знайдено', 404, 'no-order');
  }
  if (order.status === 'cancelled') {
    throw new AdminError('Запис скасовано', 409, 'cancelled');
  }

  const [client, pet] = await Promise.all([
    db.collection<Client>(CLIENT_COLLECTION).findOne({ _id: order.clientId }),
    db.collection<Pet>(PET_COLLECTION).findOne({ _id: order.petId }),
  ]);

  if (canSendTelegram()) {
    await sendTelegramMessage(reminderMessage(order, client, pet));
  } else {
    logger.warn('Reminder not sent: TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is missing');
  }

  const remindedAt = new Date();
  await orders.updateOne({ _id: order._id! }, { $set: { remindedAt } });

  return { remindedAt: remindedAt.toISOString() };
}
