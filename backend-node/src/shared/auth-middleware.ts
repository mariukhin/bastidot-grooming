import type { RequestHandler } from 'express';
import { verifyToken } from './jwt.ts';

export function requireAuth(secret: string): RequestHandler {
  return (req, res, next) => {
    const header = req.headers.authorization;
    if (!header) {
      res.status(401).json({ error: 'Authorization header missing' });
      return;
    }

    // Формат рівно "Bearer <token>" — дві частини через пробіл.
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) {
      res.status(401).json({ error: 'Expected Bearer <token>' });
      return;
    }

    try {
      const payload = verifyToken(token, secret);
      if (typeof payload.id !== 'string') {
        res.status(401).json({ error: 'Token missing user id' });
        return;
      }
      req.userId = payload.id;
      next();
    } catch (err) {
      res.status(401).json({ error: err instanceof Error ? err.message : 'Unauthorized' });
    }
  };
}
