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

export async function sendTelegramMessage(text: string): Promise<void> {
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
