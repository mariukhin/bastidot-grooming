// Аналог bootstrap/env.go: читаємо env один раз при старті і падаємо одразу,
// якщо чогось критичного бракує — а не на першому запиті посеред ночі.
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

export const config = {
  appEnv: process.env.APP_ENV ?? 'development',
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
};
