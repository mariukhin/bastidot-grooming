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
  vipPrice: number | null,
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

async function respondWithServices(db: Db, breedId: unknown, res: Response): Promise<void> {
  if (typeof breedId !== 'string' || !ObjectId.isValid(breedId)) {
    res.status(400).json({ error: 'Valid breedId is required' });
    return;
  }

  const services = await ServiceService.getByBreedId(db, breedId);
  res.json(services.map(toServiceDTO));
}

export function createServiceRouter(db: Db): Router {
  const router = Router();

  // GET /service?breedId=... — читання, тож кешується браузером і CDN.
  router.get('/', async (req: Request, res: Response) => {
    await respondWithServices(db, req.query.breedId, res);
  });

  // POST лишається тимчасово, щоб задеплоєний фронт попередньої версії
  // не зламався між викатками. Прибрати після оновлення обох частин.
  router.post('/', async (req: Request, res: Response) => {
    await respondWithServices(db, (req.body ?? {}).breedId, res);
  });

  return router;
}
