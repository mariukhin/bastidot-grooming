import { API_URL } from './config';
import useUserStore from '@/store/useUserStore';

export type OtpChannel = 'telegram' | 'sms' | 'log';

export type RequestCodeResult =
  | { ok: true; channel: OtpChannel; phone: string; expiresAt: string; resendAfterSec: number }
  | { ok: false; message: string; code?: string; retryAfterSec?: number };

/** Що сталося з карткою клієнта після підтвердження. */
export type LinkOutcome = 'linked-existing' | 'created' | 'taken';

export type VerifyCodeResult =
  { ok: true; phone: string; outcome: LinkOutcome } | { ok: false; message: string; code?: string };

const FALLBACK = 'Не вдалося. Спробуйте ще раз';
const NETWORK = "Немає зв'язку з сервером. Перевірте інтернет і спробуйте ще раз";

async function post(
  path: string,
  body: unknown
): Promise<{ status: number; data: unknown } | null> {
  const { accessToken } = useUserStore.getState();
  if (!accessToken) return null;

  try {
    const response = await fetch(`${API_URL}/protected${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(body),
    });
    return { status: response.status, data: await response.json().catch(() => null) };
  } catch {
    return null;
  }
}

type ErrorBody = { error?: unknown; code?: unknown; retryAfterSec?: unknown };

export async function requestPhoneCode(phone: string, channel?: 'sms'): Promise<RequestCodeResult> {
  const result = await post('/phone/code', { phone, ...(channel ? { channel } : {}) });
  if (!result) return { ok: false, message: NETWORK };

  const data = (result.data ?? {}) as ErrorBody &
    Partial<{ channel: OtpChannel; phone: string; expiresAt: string; resendAfterSec: number }>;

  if (result.status >= 400) {
    return {
      ok: false,
      message: typeof data.error === 'string' ? data.error : FALLBACK,
      code: typeof data.code === 'string' ? data.code : undefined,
      retryAfterSec: typeof data.retryAfterSec === 'number' ? data.retryAfterSec : undefined,
    };
  }

  return {
    ok: true,
    channel: data.channel ?? 'sms',
    phone: data.phone ?? phone,
    expiresAt: data.expiresAt ?? '',
    resendAfterSec: data.resendAfterSec ?? 60,
  };
}

export async function verifyPhoneCode(code: string): Promise<VerifyCodeResult> {
  const result = await post('/phone/verify', { code });
  if (!result) return { ok: false, message: NETWORK };

  const data = (result.data ?? {}) as ErrorBody & Partial<{ phone: string; outcome: LinkOutcome }>;

  if (result.status >= 400) {
    return {
      ok: false,
      message: typeof data.error === 'string' ? data.error : FALLBACK,
      code: typeof data.code === 'string' ? data.code : undefined,
    };
  }

  return { ok: true, phone: data.phone ?? '', outcome: data.outcome ?? 'created' };
}
