import { Router } from 'express';
import type { Request, Response } from 'express';
import type { Db } from 'mongodb';
import AuthService, { type SignupInput } from './service.ts';
import { verifyPassword } from '../../shared/password.ts';
import { verifyToken } from '../../shared/jwt.ts';
import { config } from '../../shared/config.ts';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateSignup(body: unknown): { error: string } | { input: SignupInput } {
  if (typeof body !== 'object' || body === null) {
    return { error: 'Request body must be an object' };
  }
  const b = body as Record<string, unknown>;

  if (typeof b.email !== 'string' || !EMAIL_RE.test(b.email)) {
    return { error: 'Valid email is required' };
  }
  if (typeof b.phoneNumber !== 'string' || b.phoneNumber.trim() === '') {
    return { error: 'phoneNumber is required' };
  }
  if (typeof b.password !== 'string' || b.password.length < 6) {
    return { error: 'password must be at least 6 characters' };
  }

  return {
    input: {
      // username опційне у формі реєстрації — дефолт порожній рядок
      username: typeof b.username === 'string' ? b.username : '',
      email: b.email,
      phoneNumber: b.phoneNumber.trim(),
      password: b.password,
    },
  };
}

export function createAuthRouter(db: Db): Router {
  const router = Router();

  // POST /public/signup
  router.post('/signup', async (req: Request, res: Response) => {
    const result = validateSignup(req.body);
    if ('error' in result) {
      res.status(400).json({ error: result.error });
      return;
    }
    const input = result.input;

    if (await AuthService.getByEmail(db, input.email)) {
      res.status(409).json({ error: 'Хвостик з такою поштою вже існує' });
      return;
    }
    if (await AuthService.getByPhone(db, input.phoneNumber)) {
      res.status(409).json({ error: 'Хвостик з таким номером вже існує' });
      return;
    }

    const user = await AuthService.createUser(db, input);
    const tokens = AuthService.createTokens(user);

    res.status(201).json(tokens);
  });

  // POST /public/login
  router.post('/login', async (req: Request, res: Response) => {
    const body = (req.body ?? {}) as Record<string, unknown>;

    if (typeof body.email !== 'string' || typeof body.password !== 'string') {
      res.status(400).json({ error: 'email and password are required' });
      return;
    }

    const user = await AuthService.getByEmail(db, body.email);

    if (!user || !(await verifyPassword(body.password, user.password))) {
      res.status(401).json({ error: 'Невірний логін чи пароль' });
      return;
    }

    const tokens = AuthService.createTokens(user);
    res.status(200).json(tokens);
  });

  // POST /public/refresh — обмін refresh-токена на нову пару токенів.
  router.post('/refresh', async (req: Request, res: Response) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    if (typeof body.refreshToken !== 'string') {
      res.status(400).json({ error: 'refreshToken is required' });
      return;
    }

    // Верифікуємо refresh РЕФРЕШ-секретом (не access!) — вони різні.
    let userId: string;
    try {
      const payload = verifyToken(body.refreshToken, config.refreshTokenSecret);
      if (typeof payload.id !== 'string') {
        throw new Error('Token missing user id');
      }
      userId = payload.id;
    } catch {
      res.status(401).json({ error: 'Invalid or expired refresh token' });
      return;
    }

    // Юзер міг бути видалений після видачі токена — перевіряємо, що ще є.
    const user = await AuthService.getById(db, userId);
    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    res.status(200).json(AuthService.createTokens(user));
  });

  // POST /public/login/google — верифікує Google access-token через
  // Google userinfo API і повертає дані профілю. Дзеркало Go-версії:
  // токенів НЕ видає, лише повертає профіль (фронтенд далі сам логінить).
  router.post('/login/google', async (req: Request, res: Response) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    if (typeof body.token !== 'string' || body.token === '') {
      res.status(400).json({ error: 'Token not found' });
      return;
    }

    // Вбудований fetch (Node 18+) — жодних axios/node-fetch.
    const googleRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${body.token}` },
    });

    if (!googleRes.ok) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }

    const info = (await googleRes.json()) as {
      given_name?: string;
      family_name?: string;
      email?: string;
      picture?: string;
    };

    res.status(200).json({
      name: `${info.given_name ?? ''} ${info.family_name ?? ''}`.trim(),
      email: info.email ?? '',
      photoUrl: info.picture ?? '',
    });
  });

  return router;
}
