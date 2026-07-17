import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import type { Db } from 'mongodb';
import { cors } from './middleware/cors.ts';
import { logger } from './logger.ts';
import { timeRouter } from './routes/time.ts';

// Збирання Express-застосунку відокремлене від запуску сервера (server.ts),
// щоб в інтеграційних тестах можна було створити app без відкриття порту.
// db поки не використовується — репозиторії підключаться зі Stage 2.
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

  // 404 — після всіх роутів
  app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  // Централізований error handler: 4 аргументи — саме так Express
  // відрізняє його від звичайного middleware. В Express 5 помилки
  // з async-хендлерів потрапляють сюди автоматично, без try/catch.
  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    logger.error('Unhandled error', { message: err.message });
    if (res.headersSent) {
      return next(err);
    }
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}
