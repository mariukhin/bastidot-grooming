import type { Request, Response, NextFunction } from 'express';

export function cors(req: Request, res: Response, next: NextFunction): void {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin ?? '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
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
