import type { RequestHandler } from 'express';
import { verifyToken } from './jwt.ts';
import { isRole, type Role } from './role.ts';

/**
 * Автентифікація «як вийде»: якщо валідний токен є — проставляє req.userId,
 * якщо немає або він протух — просто йде далі.
 *
 * Потрібна там, де ендпоінт публічний, але залогінений користувач має отримати
 * трохи більше. Запис через сайт мусить працювати для будь-кого, проте коли ми
 * знаємо, хто записується, то можемо звести його акаунт із карткою клієнта.
 */
export function optionalAuth(secret: string): RequestHandler {
  return (req, _res, next) => {
    const [scheme, token] = (req.headers.authorization ?? '').split(' ');

    if (scheme === 'Bearer' && token) {
      try {
        const payload = verifyToken(token, secret);
        if (typeof payload.id === 'string') {
          req.userId = payload.id;
          req.userRole = isRole(payload.role) ? payload.role : 'client';
        }
      } catch {
        // Протермінований чи підроблений токен для публічного ендпоінта —
        // не помилка: обслуговуємо запит як анонімний.
      }
    }

    next();
  };
}

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
      // Токени, видані до появи ролей, її не містять — вважаємо власника
      // клієнтом, а не припускаємо зайвих прав.
      req.userRole = isRole(payload.role) ? payload.role : 'client';
      next();
    } catch (err) {
      res.status(401).json({ error: err instanceof Error ? err.message : 'Unauthorized' });
    }
  };
}

/**
 * Пускає далі лише перелічені ролі. Ставиться ПІСЛЯ requireAuth — сам по собі
 * нікого не автентифікує, а лише звіряє роль, яку той поклав у запит.
 *
 * Роль береться з access-токена, тож зміна прав набуває чинності не миттєво, а
 * коли токен оновиться (до 2 годин). Для відкликання доступу «негайно» цього
 * замало — там знадобиться перечитувати користувача з бази.
 */
export function requireRole(...roles: Role[]): RequestHandler {
  return (req, res, next) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!req.userRole || !roles.includes(req.userRole)) {
      res.status(403).json({ error: 'Недостатньо прав' });
      return;
    }

    next();
  };
}
