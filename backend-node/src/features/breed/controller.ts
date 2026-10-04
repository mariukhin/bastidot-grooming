import { Router } from 'express';
import type { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import type { Db } from 'mongodb';
import BreedService from './service.ts';
import type { Breed } from './types.ts';
import { requireAuth, requireRole } from '../../shared/auth-middleware.ts';
import { config } from '../../shared/config.ts';

function toBreedDTO(breed: Breed): { id: string; name: string } {
  return {
    id: breed._id ? breed._id.toHexString() : '',
    name: breed.name,
  };
}

export function createBreedRouter(db: Db): Router {
  const router = Router();

  // GET /breed
  // GET /breed?q= — пошук для combobox. «Кіт» завжди перший: це не порода, а
  // окремий вид, і шукати його серед собачих порід за алфавітом незручно.
  router.get('/', async (req: Request, res: Response) => {
    const { q } = req.query;

    if (typeof q === 'string' && q.trim() !== '') {
      const found = await BreedService.search(db, q.trim());
      res.json(found.map(toBreedDTO));
      return;
    }

    const breeds = await BreedService.fetchAll(db);
    res.json(breeds.map(toBreedDTO));
  });

  // GET /breed/:id
  router.get('/:id', async (req: Request, res: Response) => {
    const { id } = req.params;

    if (typeof id !== 'string' || !ObjectId.isValid(id)) {
      res.status(400).json({ error: 'Invalid breed id' });
      return;
    }

    const breed = await BreedService.getById(db, id);
    if (!breed) {
      res.status(404).json({ error: 'Breed not found' });
      return;
    }

    res.json(toBreedDTO(breed));
  });

  // POST /breed — створення породи. Доступ лише адміну: раніше додати запис
  // у каталог міг будь-хто з інтернету.
  router.post(
    '/',
    requireAuth(config.accessTokenSecret),
    requireRole('admin'),
    async (req: Request, res: Response) => {
      const { name } = req.body ?? {};

      if (typeof name !== 'string' || name.trim() === '') {
        res.status(400).json({ error: 'name is required' });
        return;
      }

      const created = await BreedService.create(db, name.trim());
      if (!created) {
        res.status(409).json({ error: 'Breed with this name already exists' });
        return;
      }

      res.status(201).json(toBreedDTO(created));
    }
  );

  return router;
}
