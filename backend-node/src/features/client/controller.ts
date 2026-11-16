import { Router } from 'express';
import type { Request, Response } from 'express';
import type { Db } from 'mongodb';

import { requireRole } from '../../shared/auth-middleware.ts';
import {
  PetError,
  createPet,
  parsePetInput,
  toAccountPetDTO,
  updatePet,
} from '../pet/account-pets.ts';
import { ClientListError, listAdminClients, parsePage, parseSegment } from './admin-clients.ts';
import {
  ClientCardError,
  createClient,
  getClientCard,
  parseClientInput,
  requireClient,
  updateClient,
} from './admin-card.ts';

/**
 * Клієнти для адміна (під /staff, requireAuth уже стоїть). Лише роль admin:
 * тут телефони, суми й нотатки персоналу.
 *
 * GET    /admin/clients?q=&segment=&page=
 * POST   /admin/clients
 * GET    /admin/clients/:id
 * PATCH  /admin/clients/:id
 * POST   /admin/clients/:id/pets
 * PATCH  /admin/clients/:id/pets/:petId
 */
export function createAdminClientsRouter(db: Db): Router {
  const router = Router();
  router.use('/admin/clients', requireRole('admin'));

  const route =
    (handler: (req: Request, res: Response) => Promise<void>) =>
    async (req: Request, res: Response) => {
      try {
        await handler(req, res);
      } catch (err) {
        if (err instanceof ClientCardError) {
          res.status(err.status).json({
            error: err.message,
            code: err.code,
            ...(err.field ? { field: err.field } : {}),
            ...(err.existingId ? { existingId: err.existingId } : {}),
          });
          return;
        }
        if (err instanceof ClientListError) {
          res.status(err.status).json({ error: err.message, code: err.code });
          return;
        }
        // Валідація улюбленця — та сама, що в кабінеті клієнта (SCRUM-49).
        if (err instanceof PetError) {
          res.status(err.status).json({ error: err.message, ...(err.field ? { field: err.field } : {}) });
          return;
        }
        throw err;
      }
    };

  const str = (v: unknown) => (typeof v === 'string' ? v : '');

  router.get(
    '/admin/clients',
    route(async (req, res) => {
      res.json(
        await listAdminClients(db, {
          q: str(req.query.q),
          segment: parseSegment(req.query.segment),
          page: parsePage(req.query.page),
        })
      );
    })
  );

  router.post(
    '/admin/clients',
    route(async (req, res) => {
      const client = await createClient(db, parseClientInput(req.body, { partial: false }));
      res.status(201).json(await getClientCard(db, client._id!.toHexString()));
    })
  );

  router.get(
    '/admin/clients/:id',
    route(async (req, res) => {
      res.json(await getClientCard(db, String(req.params.id)));
    })
  );

  router.patch(
    '/admin/clients/:id',
    route(async (req, res) => {
      const client = await updateClient(db, String(req.params.id), parseClientInput(req.body, { partial: true }));
      res.json(await getClientCard(db, client._id!.toHexString()));
    })
  );

  router.post(
    '/admin/clients/:id/pets',
    route(async (req, res) => {
      const client = await requireClient(db, String(req.params.id));
      const input = await parsePetInput(db, req.body, { partial: false });
      const pet = await createPet(db, client._id!, input);
      res.status(201).json(await toAccountPetDTO(db, pet));
    })
  );

  router.patch(
    '/admin/clients/:id/pets/:petId',
    route(async (req, res) => {
      const client = await requireClient(db, String(req.params.id));
      const input = await parsePetInput(db, req.body, { partial: true });
      const pet = await updatePet(db, client._id!, String(req.params.petId), input);
      res.json(await toAccountPetDTO(db, pet));
    })
  );

  return router;
}
