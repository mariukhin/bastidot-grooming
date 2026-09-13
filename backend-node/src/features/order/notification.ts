import type { Db } from 'mongodb';
import { config } from '../../shared/config.ts';
import { logger } from '../../shared/logger.ts';
import { escapeHtml, isTelegramConfigured, sendTelegramMessage } from '../../shared/telegram.ts';
import { CLIENT_COLLECTION, type Client } from '../../shared/client.ts';
import { USER_COLLECTION, type User } from '../../shared/user.ts';
import { PET_COLLECTION, type Pet } from '../pet/types.ts';
import { BREED_COLLECTION, type Breed } from '../breed/types.ts';
import { SERVICE_COLLECTION, type Service } from '../service/types.ts';
import { ORDER_COLLECTION, type Order } from './types.ts';

export interface NewOrderContext {
  order: Order;
  client: Client | null;
  pet: Pet | null;
  breedName: string | null;
  groomer: User | null;
  services: Service[];
  previousOrders: number;
}

function formatDay(date: Date): string {
  return new Intl.DateTimeFormat('uk-UA', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: config.timeZone,
  }).format(date);
}

function formatTime(date: Date): string {
  return new Intl.DateTimeFormat('uk-UA', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: config.timeZone,
  }).format(date);
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  const parts = [hours > 0 ? `${hours} год` : '', rest > 0 ? `${rest} хв` : ''].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : `${minutes} хв`;
}

function servicePrice(service: Service, isVip: boolean): number {
  const price = isVip ? service.vipPrice : service.defaultPrice;
  return typeof price === 'number' ? price : 0;
}

export function buildNewOrderMessage(ctx: NewOrderContext): string {
  const { order, client, pet, breedName, groomer, services, previousOrders } = ctx;

  const isVip = groomer?.isVip ?? false;
  const start = order.scheduledAt;
  const end = new Date(start.getTime() + order.durationMinutes * 60_000);

  const blocks: string[] = ['🆕 <b>Новий запис із сайту</b>'];

  const clientLines: string[] = [];
  const clientName = escapeHtml(client?.name || 'Без імені');
  // previousOrders рахується до цього запису, тож 0 означає першого разу.
  const badge = previousOrders === 0 ? ' · 🆕 вперше' : ` · ${previousOrders + 1}-й запис`;
  clientLines.push(`👤 <b>${clientName}</b>${badge}`);
  if (client?.phone) {
    clientLines.push(`📞 ${escapeHtml(client.phone)}`);
  }
  if (client?.email) {
    clientLines.push(`✉️ ${escapeHtml(client.email)}`);
  }
  blocks.push(clientLines.join('\n'));

  if (pet) {
    const breed = breedName ? ` · ${escapeHtml(breedName)}` : '';
    blocks.push(`🐶 <b>${escapeHtml(pet.name)}</b>${breed}`);
  }

  const when = [
    `🗓 ${formatDay(start)}`,
    `🕘 ${formatTime(start)}–${formatTime(end)} · ${formatDuration(order.durationMinutes)}`,
    `✂️ Майстер: ${escapeHtml(groomer?.username ?? '—')}${isVip ? ' · VIP' : ''}`,
  ];
  blocks.push(when.join('\n'));

  if (services.length > 0) {
    const total = services.reduce((sum, service) => sum + servicePrice(service, isVip), 0);
    const list = services
      .map((service) => `• ${escapeHtml(service.type)} — ${servicePrice(service, isVip)} грн`)
      .join('\n');
    blocks.push(`📋 <b>Послуги</b>\n${list}\n💰 Разом: <b>${total} грн</b>`);
  }

  const comment = order.comment?.trim();
  if (comment) {
    blocks.push(`💬 ${escapeHtml(comment)}`);
  }

  return blocks.join('\n\n');
}

async function loadContext(db: Db, order: Order): Promise<NewOrderContext> {
  const [client, pet, groomer, services, previousOrders] = await Promise.all([
    db.collection<Client>(CLIENT_COLLECTION).findOne({ _id: order.clientId }),
    db.collection<Pet>(PET_COLLECTION).findOne({ _id: order.petId }),
    db
      .collection<User>(USER_COLLECTION)
      .findOne({ _id: order.groomerId }, { projection: { password: 0 } }),
    order.serviceIds.length > 0
      ? db
          .collection<Service>(SERVICE_COLLECTION)
          .find({ _id: { $in: order.serviceIds } })
          .toArray()
      : Promise.resolve([]),
    db
      .collection<Order>(ORDER_COLLECTION)
      .countDocuments({ clientId: order.clientId, _id: { $ne: order._id } }),
  ]);

  const breedName = pet?.breedId
    ? ((await db.collection<Breed>(BREED_COLLECTION).findOne({ _id: pet.breedId }))?.name ?? null)
    : null;

  const byId = new Map(services.map((service) => [service._id.toHexString(), service]));
  const ordered = order.serviceIds
    .map((id) => byId.get(id.toHexString()))
    .filter((service) => service !== undefined);

  return { order, client, pet, breedName, groomer, services: ordered, previousOrders };
}

export async function notifyNewOrder(db: Db, order: Order): Promise<void> {
  if (!isTelegramConfigured()) {
    logger.warn('New-order notification skipped: TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is missing');
    return;
  }

  const context = await loadContext(db, order);
  await sendTelegramMessage(buildNewOrderMessage(context));

  logger.info('New-order notification sent', { orderId: order._id?.toHexString() });
}
