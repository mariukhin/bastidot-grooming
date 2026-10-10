import type { LoginFormData } from '@/components/login-modal/login-modal';
import { API_URL } from './config';
import type { Role } from '@/store/useUserStore';

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  role: Role;
};

export type GoogleProfile = {
  name: string;
  email: string;
  photoUrl: string;
};

export type AuthResult = { ok: true; tokens: AuthTokens } | { ok: false; message: string };
export type GoogleAuthResult =
  { ok: true; tokens: AuthTokens; profile: GoogleProfile } | { ok: false; message: string };

const FALLBACK_MESSAGE = 'Не вдалося увійти. Спробуйте ще раз';
const NETWORK_MESSAGE = "Немає зв'язку з сервером. Перевірте інтернет і спробуйте ще раз";

type JsonResult = { ok: true; data: unknown } | { ok: false; message: string };

async function postJson(path: string, body: unknown): Promise<JsonResult> {
  let response: Response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    return { ok: false, message: NETWORK_MESSAGE };
  }

  const data: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      data && typeof data === 'object' && typeof (data as { error?: unknown }).error === 'string'
        ? (data as { error: string }).error
        : FALLBACK_MESSAGE;
    return { ok: false, message };
  }

  return { ok: true, data };
}

export async function authClientGoogle(token: string): Promise<GoogleAuthResult> {
  const result = await postJson('/public/login/google', { token });
  if (!result.ok) return result;

  const data = result.data as (AuthTokens & { profile?: GoogleProfile }) | null;
  if (!data || typeof data.accessToken !== 'string' || typeof data.profile?.email !== 'string') {
    return { ok: false, message: FALLBACK_MESSAGE };
  }
  return { ok: true, tokens: data, profile: data.profile };
}

async function authWithTokens(path: string, body: unknown): Promise<AuthResult> {
  const result = await postJson(path, body);
  if (!result.ok) return result;

  const tokens = result.data as AuthTokens | null;
  if (!tokens || typeof tokens.accessToken !== 'string') {
    return { ok: false, message: FALLBACK_MESSAGE };
  }
  return { ok: true, tokens };
}

export const authClient = (userData: LoginFormData): Promise<AuthResult> =>
  authWithTokens('/public/login', { login: userData.login, password: userData.password });

// Пошту шлемо лише коли її ввели: порожній рядок бекенд мусив би відрізняти
// від «не вказували», а так питання не виникає.
export const signUp = (userData: LoginFormData): Promise<AuthResult> =>
  authWithTokens('/public/signup', {
    username: userData.username,
    phoneNumber: userData.phoneNumber,
    password: userData.password,
    ...(userData.email?.trim() ? { email: userData.email.trim() } : {}),
  });

export const refreshSession = (refreshToken: string): Promise<AuthResult> =>
  authWithTokens('/public/refresh', { refreshToken });
