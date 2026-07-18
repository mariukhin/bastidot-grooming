import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import type { Db } from 'mongodb';
import { cors } from './shared/cors.ts';
import { logger } from './shared/logger.ts';
import { timeRouter } from './features/time/time.routes.ts';
import { createBreedRouter } from './features/breed/controller.ts';
import {createServiceRouter} from './features/service/controller.ts';
import {createGroomerRouter} from './features/groomer/controller.ts';
import { createPetRouter } from './features/pet/controller.ts';
import { createOrderRouter } from './features/order/controller.ts';

// Збирання Express-застосунку відокремлене від запуску сервера (server.ts),
// щоб в інтеграційних тестах можна було створити app без відкриття порту.
export function createApp(db: Db) {
  const app = express();

  app.use(cors);
  app.use(express.json());

  app.use((req, res, next) => {
    logger.info(`${req.method} ${req.path}`);
    next();
  });

  app.get('/health', (req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
  });

  app.use('/time', timeRouter);
  app.use('/breed', createBreedRouter(db));
  app.use('/service', createServiceRouter(db));
  app.use('/groomer', createGroomerRouter(db));
  app.use('/pet', createPetRouter(db));
  app.use('/order', createOrderRouter(db));

  // 404 — після всіх роутів
  app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    logger.error('Unhandled error', { message: err.message });
    if (res.headersSent) {
      return next(err);
    }
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}
