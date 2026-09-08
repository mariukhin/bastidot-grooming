import type { Db } from 'mongodb';
import type { LapsedClient, LapsedClientGroups, FindLapsedOptions } from './types.ts';
import { CLIENT_COLLECTION, type Client } from '../../shared/client.ts';
import { ORDER_COLLECTION } from '../order/types.ts';
import { PET_COLLECTION } from '../pet/types.ts';
import { BREED_COLLECTION } from '../breed/types.ts';

const DAY_MS = 24 * 60 * 60 * 1000;

function daysAgo(days: number, from: Date): Date {
  return new Date(from.getTime() - days * DAY_MS);
}

const LAPSED_CLIENT_PROJECTION = {
  _id: 0,
  clientId: '$_id',
  name: 1,
  phone: 1,
  crmGroup: 1,
  visitsCount: 1,
  dateSource: 1,
  lastVisitAt: 1,
  petName: { $ifNull: ['$pet.name', null] },
  petAge: { $ifNull: ['$pet.age', null] },
  petBreed: { $ifNull: ['$breed.name', null] },
};

async function findLapsedClients(
  db: Db,
  options: FindLapsedOptions,
  now: Date = new Date()
): Promise<LapsedClientGroups> {
  const inactiveBefore = daysAgo(options.inactiveDays, now);
  const cooldownSince = daysAgo(options.cooldownDays, now);

  const [result] = await db
    .collection<Client>(CLIENT_COLLECTION)
    .aggregate<LapsedClientGroups>([
      {
        $match: {
          lastVisitAt: { $ne: null, $lte: inactiveBefore },
          doNotContact: { $ne: true },
          phone: { $nin: ['', null] },
          $or: [
            { remindAfter: { $ne: null, $lte: now } },
            {
              $and: [
                { $or: [{ remindAfter: null }, { remindAfter: { $exists: false } }] },
                { $or: [{ lastNotifiedAt: null }, { lastNotifiedAt: { $lt: cooldownSince } }] },
              ],
            },
          ],
        },
      },

      {
        $lookup: {
          from: ORDER_COLLECTION,
          let: { clientId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$clientId', '$$clientId'] },
                    { $eq: ['$status', 'pending'] },
                    { $gt: ['$scheduledAt', now] },
                  ],
                },
              },
            },
            { $limit: 1 },
            { $project: { _id: 1 } },
          ],
          as: 'upcoming',
        },
      },
      { $match: { upcoming: { $size: 0 } } },
      {
        $lookup: {
          from: PET_COLLECTION,
          localField: '_id',
          foreignField: 'userId',
          as: 'pets',
        },
      },
      { $addFields: { pet: { $first: '$pets' } } },

      {
        $lookup: {
          from: BREED_COLLECTION,
          localField: 'pet.breedId',
          foreignField: '_id',
          as: 'breed',
        },
      },
      { $addFields: { breed: { $first: '$breed' } } },
      {
        $facet: {
          warm: [
            { $sort: { lastVisitAt: -1 } },
            { $limit: options.batchSize },
            { $project: LAPSED_CLIENT_PROJECTION },
          ],
          cold: [
            { $sort: { lastVisitAt: 1 } },
            { $limit: options.batchSize },
            { $project: LAPSED_CLIENT_PROJECTION },
          ],
        },
      },
    ])
    .toArray();

  const warm = result?.warm ?? [];
  const cold = result?.cold ?? [];

  const warmIds = new Set(warm.map((client) => client.clientId.toHexString()));

  return {
    warm,
    cold: cold.filter((client) => !warmIds.has(client.clientId.toHexString())),
  };
}

async function markNotified(
  db: Db,
  groups: LapsedClientGroups,
  sentAt: Date = new Date()
): Promise<void> {
  const entries: Array<{ client: LapsedClient; group: 'warm' | 'cold' }> = [
    ...groups.warm.map((client) => ({ client, group: 'warm' as const })),
    ...groups.cold.map((client) => ({ client, group: 'cold' as const })),
  ];

  if (entries.length === 0) {
    return;
  }

  await db.collection<Client>(CLIENT_COLLECTION).bulkWrite(
    entries.map(({ client, group }) => ({
      updateOne: {
        filter: { _id: client.clientId },
        update: {
          $set: { lastNotifiedAt: sentAt, remindAfter: null },
          $push: {
            notifyHistory: { sentAt, lastVisitAt: client.lastVisitAt, group },
          },
        },
      },
    }))
  );
}

async function wasSentSince(db: Db, since: Date): Promise<boolean> {
  const count = await db
    .collection<Client>(CLIENT_COLLECTION)
    .countDocuments({ lastNotifiedAt: { $gte: since } }, { limit: 1 });
  return count > 0;
}

const ReminderService = {
  findLapsedClients,
  markNotified,
  wasSentSince,
};

export default ReminderService;
