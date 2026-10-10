import { Router } from 'express';
import type { Request, Response } from 'express';
import type { Db } from 'mongodb';
import AuthService, { type SignupInput } from './service.ts';
import { verifyPassword } from '../../shared/password.ts';
import { verifyToken } from '../../shared/jwt.ts';
import { config } from '../../shared/config.ts';
import { logger } from '../../shared/logger.ts';
import { normalizePhone } from '../../shared/phone.ts';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateSignup(body: unknown): { error: string } | { input: SignupInput } {
  if (typeof body !== 'object' || body === null) {
    return { error: 'Request body must be an object' };
  }
  const b = body as Record<string, unknown>;

  // Пошта необовʼязкова: акаунт тримається на телефоні. Але якщо її вказали —
  // мусить бути схожою на пошту, інакше людина не зможе нею ж і увійти.
  const email = typeof b.email === 'string' ? b.email.trim() : '';
  if (email !== '' && !EMAIL_RE.test(email)) {
    return { error: 'Невірний формат пошти' };
  }
  // Телефон тепер єдине обовʼязкове поле, за яким акаунт знаходять при вході,
  // тож перевіряємо не «непорожній рядок», а справжній номер: маска на фронті
  // надсилає «+380» навіть коли цифр не ввели.
  const phone = normalizePhone(typeof b.phoneNumber === 'string' ? b.phoneNumber : '');
  if (!phone) {
    return { error: 'Вкажіть коректний номер телефону' };
  }
  if (typeof b.password !== 'string' || b.password.length < 6) {
    return { error: 'password must be at least 6 characters' };
  }

  return {
    input: {
      // username опційне у формі реєстрації — дефолт порожній рядок
      username: typeof b.username === 'string' ? b.username : '',
      ...(email !== '' ? { email } : {}),
      phoneNumber: phone.phone,
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

    if (input.email && (await AuthService.getByEmail(db, input.email))) {
      res.status(409).json({ error: 'Хвостик з такою поштою вже існує' });
      return;
    }
    if (await AuthService.getByPhone(db, input.phoneNumber)) {
      res.status(409).json({ error: 'Хвостик з таким номером вже існує' });
      return;
    }

    const user = await AuthService.createUser(db, input);

    const clientId = await AuthService.findClientByPhone(db, input.phoneNumber);
    if (clientId && (await AuthService.linkClient(db, user._id!, clientId))) {
      logger.info('Акаунт звʼязано з карткою клієнта', {
        userId: user._id!.toHexString(),
        clientId: clientId.toHexString(),
      });
    }

    const tokens = AuthService.createTokens(user);

    res.status(201).json(tokens);
  });

  // POST /public/login — логін це пошта АБО телефон. Поле login нове, email
  // лишили заради вже випущеного фронта й зовнішніх викликів.
  router.post('/login', async (req: Request, res: Response) => {
    const body = (req.body ?? {}) as Record<string, unknown>;

    const login = typeof body.login === 'string' ? body.login.trim() : '';
    const fallback = typeof body.email === 'string' ? body.email.trim() : '';
    const identifier = login !== '' ? login : fallback;

    if (identifier === '' || typeof body.password !== 'string') {
      res.status(400).json({ error: 'Вкажіть пошту або телефон і пароль' });
      return;
    }

    const user = identifier.includes('@')
      ? await AuthService.getByEmail(db, identifier)
      : await AuthService.getByPhone(db, identifier);

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

  // POST /public/login/google — верифікує Google access-token через Google
  // userinfo API, заводить (або знаходить) користувача за поштою і видає ту саму
  // пару токенів, що й звичайний логін, плюс профіль для аватарки в шапці.
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
      verified_email?: boolean;
      picture?: string;
    };

    const email = info.email ?? '';
    if (email === '') {
      res.status(401).json({ error: 'Google не повернув пошту' });
      return;
    }

    if (info.verified_email === false) {
      res.status(401).json({ error: 'Пошту в Google не підтверджено' });
      return;
    }

    const user = await AuthService.findOrCreateGoogleUser(db, {
      username: `${info.given_name ?? ''} ${info.family_name ?? ''}`.trim(),
      email,
      photoUrl: info.picture ?? '',
    });

    res.status(200).json({
      ...AuthService.createTokens(user),
      profile: {
        name: user.username,
        email: user.email,
        photoUrl: user.photoUrl,
      },
    });
  });

  return router;
}
