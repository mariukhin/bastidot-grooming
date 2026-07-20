import { scrypt, randomBytes, timingSafeEqual } from 'node:crypto';

const SALT_BYTES = 16;
const KEY_BYTES = 64;

function scryptAsync(password: string, salt: Buffer, keylen: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keylen, (err, derivedKey) => {
      if (err) {
        reject(err);
      } else {
        resolve(derivedKey);
      }
    });
  });
}

export async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const derivedKey = await scryptAsync(plain, salt, KEY_BYTES);

  return `${salt.toString('hex')}:${derivedKey.toString('hex')}`;
}

export async function verifyPassword(plain: string, stored: string): Promise<boolean> {
  const [saltHex, keyHex] = stored.split(':');

  if (!saltHex || !keyHex) {
    return false;
  }

  const salt = Buffer.from(saltHex, 'hex');
  const storedKey = Buffer.from(keyHex, 'hex');

  const derivedKey = await scryptAsync(plain, salt, KEY_BYTES);

  // timingSafeEqual кидає, якщо буфери різної довжини. Тому спочатку
  // порівнюємо довжини звичайним способом (довжина хешу не секрет).
  if (derivedKey.length !== storedKey.length) {
    return false;
  }

  // Порівняння за СТАЛИЙ час — не виходить на першому різному байті.
  // Звичайне === «зливало» б хеш побайтово через час відповіді (timing attack).
  return timingSafeEqual(derivedKey, storedKey);
}
