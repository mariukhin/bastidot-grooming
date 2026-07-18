import { Router } from 'express';
import type { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import type { Db } from 'mongodb';
import PetService from './service.ts';
import type { Pet, CreatePetInput } from './types.ts';

interface PetDTO {
  id: string;
  name: string;
  age: number;
  weight: number;
  photoUrl: string;
  userId: string;
  createdAt: string;
  comment: string;
}

function toPetDTO(pet: Pet): PetDTO {
  return {
    id: pet._id ? pet._id.toHexString() : '',
    name: pet.name,
    age: pet.age,
    weight: pet.weight,
    photoUrl: pet.photoUrl,
    userId: pet.userId.toHexString(),
    createdAt: pet.createdAt.toISOString(),
    comment: pet.comment,
  };
}

function validateCreatePet(body: unknown): { error: string } | { input: CreatePetInput } {
  if (typeof body !== 'object' || body === null) {
    return { error: 'Request body must be an object' };
  }

  const { name, age, weight, userId, photoUrl, comment } = body as Record<string, unknown>;

  if (typeof name !== 'string' || name.trim() === '') {
    return { error: 'name is required' };
  }
  if (typeof age !== 'number' || age < 0) {
    return { error: 'age must be a non-negative number' };
  }
  if (typeof weight !== 'number' || weight <= 0) {
    return { error: 'weight must be a positive number' };
  }
  if (typeof userId !== 'string' || !ObjectId.isValid(userId)) {
    return { error: 'valid userId is required' };
  }

  return {
    input: {
      name: name.trim(),
      age,
      weight,
      userId,
      photoUrl: typeof photoUrl === 'string' ? photoUrl : undefined,
      comment: typeof comment === 'string' ? comment : undefined,
    },
  };
}

export function createPetRouter(db: Db): Router {
  const router = Router();

  // POST /pet
  router.post('/', async (req: Request, res: Response) => {
    const result = validateCreatePet(req.body);
    if ('error' in result) {
      res.status(400).json({ error: result.error });
      return;
    }

    const pet = await PetService.create(db, result.input);
    res.status(201).json(toPetDTO(pet));
  });

  // GET /pet?userId=...
  router.get('/', async (req: Request, res: Response) => {
    const { userId } = req.query;

    if (typeof userId !== 'string' || !ObjectId.isValid(userId)) {
      res.status(400).json({ error: 'valid userId query param is required' });
      return;
    }

    const pets = await PetService.fetchByUserId(db, userId);
    res.json(pets.map(toPetDTO));
  });

  // GET /pet/:id
  router.get('/:id', async (req: Request, res: Response) => {
    const { id } = req.params;

    if (typeof id !== 'string' || !ObjectId.isValid(id)) {
      res.status(400).json({ error: 'Invalid pet id' });
      return;
    }

    const pet = await PetService.getById(db, id);
    if (!pet) {
      res.status(404).json({ error: 'Pet not found' });
      return;
    }

    res.json(toPetDTO(pet));
  });

  return router;
}
