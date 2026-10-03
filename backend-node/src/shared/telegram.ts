import { config } from './config.ts';
import { logger } from './logger.ts';

const API_BASE = 'https://api.telegram.org';

const MAX_MESSAGE_LENGTH = 4096;

export function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function isTelegramConfigured(): boolean {
  return Boolean(config.telegramBotToken && config.telegramChatId);
}

/** Чи можна реально щось надіслати: і налаштовано, і ввімкнено для цього середовища. */
export function canSendTelegram(): boolean {
  return config.telegramEnabled && isTelegramConfigured();
}

export async function sendTelegramMessage(text: string): Promise<void> {
  // Остання застава перед мережею. Навіть якщо хтось покличе цю функцію повз
  // перевірки вище, у не-продакшн середовищі повідомлення лише потрапить у лог.
  if (!config.telegramEnabled) {
    logger.info('Telegram вимкнено для цього середовища — повідомлення не надіслано', {
      appEnv: config.appEnv,
      preview: text.replace(/<[^>]+>/g, '').split('\n')[0]?.slice(0, 80),
    });
    return;
  }

  if (!isTelegramConfigured()) {
    throw new Error('Telegram is not configured: set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID');
  }

  if (text.length > MAX_MESSAGE_LENGTH) {
    throw new Error(`Telegram message is too long: ${text.length} > ${MAX_MESSAGE_LENGTH}`);
  }

  const response = await fetch(`${API_BASE}/bot${config.telegramBotToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: config.telegramChatId,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    }),
    signal: AbortSignal.timeout(15_000),
  });

  const payload = (await response.json()) as { ok: boolean; description?: string };
  if (!response.ok || !payload.ok) {
    throw new Error(`Telegram API error: ${payload.description ?? response.statusText}`);
  }

  logger.info('Telegram message sent', { chatId: config.telegramChatId });
}
