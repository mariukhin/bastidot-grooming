import { config } from '../../shared/config.ts';
import { logger } from '../../shared/logger.ts';
import type { OtpChannel } from './types.ts';

export interface SendResult {
  ok: boolean;
  requestId?: string;
}

export interface OtpSender {
  readonly channel: OtpChannel;
  canSend(phone: string): Promise<{ ok: boolean; requestId?: string }>;
  send(phone: string, code: string, requestId?: string): Promise<SendResult>;
}

const GATEWAY_URL = 'https://gatewayapi.telegram.org';
const TURBOSMS_URL = 'https://api.turbosms.ua/message/send.json';

async function postJson(url: string, token: string, body: unknown): Promise<unknown> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });

  return await response.json();
}

const telegramSender: OtpSender = {
  channel: 'telegram',

  async canSend(phone) {
    if (!config.telegramGatewayToken) return { ok: false };

    try {
      const data = (await postJson(`${GATEWAY_URL}/checkSendAbility`, config.telegramGatewayToken, {
        phone_number: phone,
      })) as { ok?: boolean; result?: { request_id?: string } };

      return { ok: data.ok === true, requestId: data.result?.request_id };
    } catch (err) {
      logger.error('Telegram Gateway: checkSendAbility не відповів', {
        message: err instanceof Error ? err.message : String(err),
      });
      return { ok: false };
    }
  },

  async send(phone, code, requestId) {
    try {
      const data = (await postJson(
        `${GATEWAY_URL}/sendVerificationMessage`,
        config.telegramGatewayToken,
        {
          phone_number: phone,
          // Плату вже знято на checkSendAbility: з цим ідентифікатором саме
          // надсилання безкоштовне.
          ...(requestId ? { request_id: requestId } : {}),
          code,
          // Код живе стільки ж, скільки в нас: Gateway не бере плати за
          // недоставлене, тож нема сенсу тримати довше за наш власний TTL.
          ttl: config.otpTtlMinutes * 60,
        }
      )) as { ok?: boolean; result?: { request_id?: string } };

      return { ok: data.ok === true, requestId: data.result?.request_id };
    } catch (err) {
      logger.error('Telegram Gateway: sendVerificationMessage не вдався', {
        message: err instanceof Error ? err.message : String(err),
      });
      return { ok: false };
    }
  },
};

const smsSender: OtpSender = {
  channel: 'sms',

  async canSend() {
    return { ok: Boolean(config.turbosmsToken && config.turbosmsSender) };
  },

  async send(phone, code) {
    try {
      const data = (await postJson(TURBOSMS_URL, config.turbosmsToken, {
        recipients: [phone],
        sms: {
          sender: config.turbosmsSender,
          text: `Bastidot: код підтвердження ${code}. Нікому його не кажіть.`,
        },
      })) as { response_code?: number; response_status?: string };

      // 0 і 800 — «прийнято до відправлення», решта — відмова.
      const ok = data.response_code === 0 || data.response_code === 800;
      if (!ok) {
        logger.error('TurboSMS відмовив', { code: data.response_code, status: data.response_status });
      }
      return { ok };
    } catch (err) {
      logger.error('TurboSMS не відповів', {
        message: err instanceof Error ? err.message : String(err),
      });
      return { ok: false };
    }
  },
};

/**
 * Канал для дева: нікуди не шле, пише код у лог.
 *
 * Так само, як із телеграм-сповіщеннями: локальний прогін не має ні коштувати
 * грошей, ні будити реальних людей серед ночі.
 */
const logSender: OtpSender = {
  channel: 'log',
  async canSend() {
    return { ok: true };
  },
  async send(phone, code) {
    logger.info('OTP (доставка вимкнена, код лише в лог)', { phone, code });
    return { ok: true };
  },
};

/** Відправник разом із ідентифікатором перевірки, за який уже заплачено. */
export interface PickedSender {
  sender: OtpSender;
  requestId?: string;
}

/**
 * Обирає канал: спершу дешевший Telegram, далі SMS.
 *
 * requestId тягнемо далі в send, щоб не платити за той самий код двічі.
 */
export async function pickSender(phone: string): Promise<PickedSender | null> {
  if (!config.otpDeliveryEnabled) {
    return { sender: logSender };
  }

  const telegram = await telegramSender.canSend(phone);
  if (telegram.ok) {
    return { sender: telegramSender, requestId: telegram.requestId };
  }

  const sms = await smsSender.canSend(phone);
  if (sms.ok) {
    return { sender: smsSender };
  }

  return null;
}

/** Канал, заданий явно: кнопка «надіслати SMS», коли код у Telegram не дійшов. */
export async function senderByChannel(channel: OtpChannel): Promise<PickedSender | null> {
  if (!config.otpDeliveryEnabled) {
    return { sender: logSender };
  }
  if (channel === 'sms' && (await smsSender.canSend('')).ok) {
    return { sender: smsSender };
  }
  return null;
}
