import { ObjectId } from 'mongodb';
import type { Db } from 'mongodb';

import { USER_COLLECTION, type User } from '../../shared/user.ts';
import { PET_COLLECTION, type Pet } from '../pet/types.ts';
import { BREED_COLLECTION, type Breed } from '../breed/types.ts';
import { SERVICE_COLLECTION, type Service } from '../service/types.ts';
import { ORDER_COLLECTION, type Order } from '../order/types.ts';

export interface AccountVisit {
  id: string;
  scheduledAt: string;
  durationMinutes: number;
  status: Order['status'];
  groomerName: string | null;
  serviceNames: string[];
  price: number | null;
}

/**
 * Усе в кабінеті висить на user.clientId — картці клієнта в CRM. Поки акаунт із
 * нею не зведено (а зводиться вона при реєстрації за телефоном або при першому
 * записі), показувати нічого: це не помилка, а порожній стан.
 */
async function getClientId(db: Db, userId: string): Promise<ObjectId | null> {
  if (!ObjectId.isValid(userId)) return null;

  const user = await db
    .collection<User>(USER_COLLECTION)
    .findOne({ _id: new ObjectId(userId) }, { projection: { clientId: 1 } });

  return user?.clientId ?? null;
}

export async function fetchAccountVisits(db: Db, userId: string): Promise<AccountVisit[]> {
  const clientId = await getClientId(db, userId);
  if (!clientId) return [];

  const orders = await db
    .collection<Order>(ORDER_COLLECTION)
    .find({ clientId })
    .sort({ scheduledAt: -1 })
    .toArray();
  if (orders.length === 0) return [];

  const serviceIds = orders.flatMap((order) => order.serviceIds);
  const groomerIds = [...new Set(orders.map((order) => order.groomerId.toHexString()))];

  const [services, groomers] = await Promise.all([
    serviceIds.length > 0
      ? db
          .collection<Service>(SERVICE_COLLECTION)
          .find({ _id: { $in: serviceIds } })
          .toArray()
      : Promise.resolve([]),
    db
      .collection<User>(USER_COLLECTION)
      .find(
        { _id: { $in: groomerIds.map((id) => new ObjectId(id)) } },
        { projection: { username: 1, isVip: 1 } }
      )
      .toArray(),
  ]);

  const serviceById = new Map(services.map((service) => [service._id.toHexString(), service]));
  const groomerById = new Map(groomers.map((groomer) => [groomer._id!.toHexString(), groomer]));

  return orders.map((order) => {
    const groomer = groomerById.get(order.groomerId.toHexString());
    const ordered = order.serviceIds
      .map((id) => serviceById.get(id.toHexString()))
      .filter((service) => service !== undefined);

    // Ціну рахуємо так само, як її бачив клієнт при записі: у VIP-грумера
    // діє vipPrice, а в додаткових послуг він null — тоді береться базова.
    const price = ordered.reduce((sum, service) => {
      const vip = groomer?.isVip ? service.vipPrice : null;
      return sum + (typeof vip === 'number' ? vip : (service.defaultPrice ?? 0));
    }, 0);

    return {
      id: order._id!.toHexString(),
      scheduledAt: order.scheduledAt.toISOString(),
      durationMinutes: order.durationMinutes,
      status: order.status,
      groomerName: groomer?.username ?? null,
      serviceNames: ordered.map((service) => service.type),
      price: ordered.length > 0 ? price : null,
    };
  });
}
