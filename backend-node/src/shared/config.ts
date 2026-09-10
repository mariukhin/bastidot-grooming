function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env variable: ${name}`);
  }
  return value;
}

function optionalInt(name: string, fallback: number): number {
  const value = process.env[name];
  return value ? Number.parseInt(value, 10) : fallback;
}

function optionalString(name: string, fallback: string): string {
  const value = process.env[name];
  return value && value.trim() !== '' ? value.trim() : fallback;
}

export const config = {
  appEnv: optionalString('APP_ENV', 'development'),
  port: optionalInt('PORT', 8081),
  contextTimeoutSec: optionalInt('CONTEXT_TIMEOUT', 2),

  dbHost: required('DB_HOST'),
  dbUser: required('DB_USER'),
  dbPass: required('DB_PASS'),
  dbName: required('DB_NAME'),

  accessTokenExpiryHour: optionalInt('ACCESS_TOKEN_EXPIRY_HOUR', 2),
  refreshTokenExpiryHour: optionalInt('REFRESH_TOKEN_EXPIRY_HOUR', 168),
  accessTokenSecret: required('ACCESS_TOKEN_SECRET'),
  refreshTokenSecret: required('REFRESH_TOKEN_SECRET'),
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? '',

  corsOrigins: (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin !== ''),
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN ?? '',
  telegramChatId: process.env.TELEGRAM_CHAT_ID ?? '',

  reminderInactiveDays: optionalInt('REMINDER_INACTIVE_DAYS', 60),
  reminderCooldownDays: optionalInt('REMINDER_COOLDOWN_DAYS', 30),
  reminderWarmSize: optionalInt('REMINDER_WARM_COUNT', 6),
  reminderColdSize: optionalInt('REMINDER_COLD_COUNT', 2),
  reminderNoAnswerSize: optionalInt('REMINDER_NOANSWER_COUNT', 2),
  reminderRunAt: optionalString('REMINDER_RUN_AT', '11:00'),
  reminderInProcess: process.env.REMINDER_IN_PROCESS === 'true',
  reminderTimeZone: optionalString('REMINDER_TIME_ZONE', 'Europe/Kyiv'),
};
