import { Router } from 'express';
import type { Request, Response } from 'express';
import type { Db } from 'mongodb';
import GroomerService from './service.ts';
import type { User } from './types.ts';

function toGroomerDTO(groomer: User): {
  id: string,
  name: string;
  photoUrl: string;
  isVip: boolean;
} {
  return {
    id: groomer._id ? groomer._id.toHexString() : '',
    name: groomer.username,
    photoUrl: groomer.photoUrl,
    isVip: groomer.isVip ?? false
  };
}

export function createGroomerRouter(db: Db): Router {
  const router = Router();

  // GET /groomer
  router.get('/', async (req: Request, res: Response) => {
    const groomers = await GroomerService.fetchGroomers(db);
    res.json(groomers.map(toGroomerDTO));
  });

  return router;
}
