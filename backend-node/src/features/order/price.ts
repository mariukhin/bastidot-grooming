import type { Db } from 'mongodb';

import { USER_COLLECTION, type User } from '../../shared/user.ts';
import { SERVICE_COLLECTION, type Service } from '../service/types.ts';
import type { Order } from './types.ts';

/**
 * Вартість візиту за поточним прайсом: VIP-ціна, якщо грумер VIP і вона задана,
 * інакше базова. Та сама логіка, що в adminDay/accountOrders і в pipeline клієнтів.
 */
export async function priceOf(db: Db, order: Pick<Order, 'serviceIds' | 'groomerId'>): Promise<number> {
  if (order.serviceIds.length === 0) return 0;

  const [services, groomer] = await Promise.all([
    db
      .collection<Service>(SERVICE_COLLECTION)
      .find({ _id: { $in: order.serviceIds } }, { projection: { defaultPrice: 1, vipPrice: 1 } })
      .toArray(),
    db.collection<User>(USER_COLLECTION).findOne({ _id: order.groomerId }, { projection: { isVip: 1 } }),
  ]);

  const vip = groomer?.isVip === true;
  return services.reduce(
    (sum, s) => sum + (vip && typeof s.vipPrice === 'number' ? s.vipPrice : (s.defaultPrice ?? 0)),
    0
  );
}
