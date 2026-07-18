import { Router } from 'express';
import type { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import type { Db } from 'mongodb';
import type { Service } from './types.ts';
import ServiceService from "./service.ts";

function toServiceDTO(service: Service): {
  id: string,
  breedId: string,
  type: string,
  defaultPrice: number,
  vipPrice: number,
  durationHour: number,
  durationMin: number
} {
  return {
    id: service._id ? service._id.toHexString() : '',
    breedId: service.breedId ? service.breedId.toHexString() : '',
    type: service.type,
    defaultPrice: service.defaultPrice,
    vipPrice: service.vipPrice,
    durationHour: service.durationHour,
    durationMin: service.durationMin
  };
}

export function createServiceRouter(db: Db): Router {
  const router = Router();

  // POST /service
  router.post('/', async (req: Request, res: Response) => {
    const { breedId } = req.body ?? {};

    if (typeof breedId !== 'string' || !ObjectId.isValid(breedId)) {
      res.status(400).json({ error: 'Valid breedId is required' });
      return;
    }

    const services = await ServiceService.getByBreedId(db, breedId);

    res.json(services.map(toServiceDTO));
  });

  return router;
}
