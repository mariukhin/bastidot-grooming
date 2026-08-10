import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import type { Db } from 'mongodb';
import { cors } from './shared/cors.ts';
import pinoHttp from 'pino-http';
import { createBreedRouter } from './features/breed/controller.ts';
import {createServiceRouter} from './features/service/controller.ts';
import {createGroomerRouter} from './features/groomer/controller.ts';
import { createPetRouter } from './features/pet/controller.ts';
import { createOrderRouter } from './features/order/controller.ts';
import { createAuthRouter } from './features/auth/controller.ts';
import { createProfileRouter } from './features/profile/controller.ts';
import { requireAuth } from './shared/auth-middleware.ts';
import { config } from './shared/config.ts';

// Збирання Express-застосунку відокремлене від запуску сервера (server.ts),
// щоб в інтеграційних тестах можна було створити app без відкриття порту.
export function createApp(db: Db) {
  const app = express();
  const httpLogger = pinoHttp();

  app.use(cors);
  app.use(express.json());

  app.use(httpLogger);

  app.get('/health', (req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
  });

  app.use('/breed', createBreedRouter(db));
  app.use('/service', createServiceRouter(db));
  app.use('/groomer', createGroomerRouter(db));
  app.use('/pet', createPetRouter(db));
  app.use('/order', createOrderRouter(db));
  app.use('/public', createAuthRouter(db));

  app.use('/protected', requireAuth(config.accessTokenSecret), createProfileRouter(db));

  // 404 — після всіх роутів
  app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    if (res.headersSent) {
      return next(err);
    }
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}
