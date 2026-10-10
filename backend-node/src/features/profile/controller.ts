import { Router } from 'express';
import type { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import type { Db } from 'mongodb';
import { USER_COLLECTION, type User } from '../../shared/user.ts';
import { getRole } from '../../shared/role.ts';
import { listAccountOrders, type OrderScope } from '../order/account-orders.ts';
import {
  archivePet,
  createPet,
  findClientId,
  listPets,
  parsePetInput,
  PetError,
  requireClientId,
  toAccountPetDTO,
  updatePet,
} from '../pet/account-pets.ts';
import { parseProfileUpdate, ProfileUpdateError, updateProfile } from './update.ts';

function toProfileDTO(user: User) {
  return {
    id: user._id ? user._id.toHexString() : '',
    name: user.username,
    email: user.email ?? '',
    phoneNumber: user.phoneNumber,
    photoUrl: user.photoUrl,
    role: getRole(user),
    isAdmin: user.isAdmin,
    isGroomer: user.isGroomer,
    isVip: user.isVip,
  };
}

export function createProfileRouter(db: Db): Router {
  const router = Router();

  // GET /protected/profile
  router.get('/profile', async (req: Request, res: Response) => {
    const userId = req.userId;
    if (!userId || !ObjectId.isValid(userId)) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const user = await db
      .collection<User>(USER_COLLECTION)
      .findOne({ _id: new ObjectId(userId) }, { projection: { password: 0 } });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json(toProfileDTO(user));
  });

  // PATCH /protected/profile — імʼя та пошта. Телефон навмисно не міняється:
  router.patch('/profile', async (req: Request, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    try {
      const updated = await updateProfile(db, req.userId, parseProfileUpdate(req.body));
      res.json(toProfileDTO(updated));
    } catch (err) {
      if (err instanceof ProfileUpdateError) {
        res.status(err.status).json({ error: err.message, field: err.field });
        return;
      }
      throw err;
    }
  });

  const petRoute =
    (handler: (userId: string, req: Request, res: Response) => Promise<void>) =>
    async (req: Request, res: Response) => {
      if (!req.userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      try {
        await handler(req.userId, req, res);
      } catch (err) {
        if (err instanceof PetError) {
          res.status(err.status).json({ error: err.message, field: err.field });
          return;
        }
        throw err;
      }
    };

  router.get(
    '/pets',
    petRoute(async (userId, _req, res) => {
      // Для читання картку не створюємо: немає — просто порожній список.
      const clientId = await findClientId(db, userId);
      if (!clientId) {
        res.json([]);
        return;
      }
      const pets = await listPets(db, clientId);
      res.json(await Promise.all(pets.map((pet) => toAccountPetDTO(db, pet))));
    })
  );

  router.post(
    '/pets',
    petRoute(async (userId, req, res) => {
      const clientId = await requireClientId(db, userId);
      const input = await parsePetInput(db, req.body, { partial: false });
      const pet = await createPet(db, clientId, input);
      res.status(201).json(await toAccountPetDTO(db, pet));
    })
  );

  router.patch(
    '/pets/:id',
    petRoute(async (userId, req, res) => {
      const clientId = await requireClientId(db, userId);
      const input = await parsePetInput(db, req.body, { partial: true });
      const pet = await updatePet(db, clientId, String(req.params.id ?? ''), input);
      res.json(await toAccountPetDTO(db, pet));
    })
  );

  router.delete(
    '/pets/:id',
    petRoute(async (userId, req, res) => {
      const clientId = await requireClientId(db, userId);
      await archivePet(db, clientId, String(req.params.id ?? ''));
      res.status(204).end();
    })
  );

  // GET /protected/orders?scope=upcoming|past&cursor=&limit=
  router.get('/orders', async (req: Request, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const scope: OrderScope = req.query.scope === 'past' ? 'past' : 'upcoming';
    const cursor = typeof req.query.cursor === 'string' && req.query.cursor !== '' ? req.query.cursor : null;
    const limit = Number.parseInt(String(req.query.limit ?? ''), 10);

    const clientId = await findClientId(db, req.userId);
    if (!clientId) {
      // Картки клієнта ще немає — записів теж, і це не помилка.
      res.json({ items: [], nextCursor: null });
      return;
    }

    res.json(
      await listAccountOrders(db, clientId, scope, cursor, Number.isFinite(limit) ? limit : undefined)
    );
  });

  return router;
}
