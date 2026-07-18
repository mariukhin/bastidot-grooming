import { Router } from 'express';
import type { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import type { Db } from 'mongodb';
import BreedService from './service.ts';
import type { Breed } from './types.ts';

function toBreedDTO(breed: Breed): { id: string; name: string } {
  return {
    id: breed._id ? breed._id.toHexString() : '',
    name: breed.name,
  };
}

export function createBreedRouter(db: Db): Router {
  const router = Router();

  // GET /breed
  router.get('/', async (req: Request, res: Response) => {
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

  // POST /breed
  router.post('/', async (req: Request, res: Response) => {
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
  });

  return router;
}
