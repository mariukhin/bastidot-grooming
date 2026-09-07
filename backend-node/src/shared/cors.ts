import type { Request, Response, NextFunction } from 'express';
import { config } from './config.ts';

function isAllowed(origin: string): boolean {
  if (config.appEnv !== 'production') {
    return true;
  }
  return config.corsOrigins.includes(origin);
}

export function cors(req: Request, res: Response, next: NextFunction): void {
  const origin = req.headers.origin;

  if (origin && isAllowed(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Accept, Authorization, Content-Type, X-CSRF-Token, Origin, X-Requested-With'
  );
  res.setHeader('Access-Control-Max-Age', '300');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  next();
}
