import { randomInt } from 'node:crypto';
import { ObjectId } from 'mongodb';
import type { Db } from 'mongodb';

import { USER_COLLECTION, type User } from '../../shared/user.ts';
import { hashPassword, verifyPassword } from '../../shared/password.ts';
import { normalizePhone } from '../../shared/phone.ts';
import { logger } from '../../shared/logger.ts';
import { config } from '../../shared/config.ts';
import AuthService, { type LinkOutcome } from '../auth/service.ts';
import { pickSender, senderByChannel } from './senders.ts';
import {
  OTP_COLLECTION,
  OTP_MAX_ATTEMPTS,
  OTP_MAX_PER_IP_HOUR,
  OTP_MAX_PER_PHONE_HOUR,
  OTP_RESEND_COOLDOWN_SEC,
  type OtpChannel,
  type OtpCode,
} from './types.ts';

export class OtpError extends Error {
  readonly status: number;
  readonly code: string;
  readonly retryAfterSec?: number;

  constructor(message: string, status: number, code: string, retryAfterSec?: number) {
    super(message);
    this.status = status;
    this.code = code;
    this.retryAfterSec = retryAfterSec;
  }
}

export interface RequestCodeResult {
  channel: OtpChannel;
  phone: string;
  expiresAt: Date;
  resendAfterSec: number;
}

function generateCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

/** Телефон у канонічному вигляді або зрозуміла помилка. */
function requirePhone(raw: string): string {
  const phone = normalizePhone(raw);
  if (!phone || phone.isForeign) {
    throw new OtpError('Вкажіть український номер телефону', 400, 'bad-phone');
  }
  return phone.phone;
}

async function assertLimits(db: Db, phone: string, ip: string | undefined): Promise<void> {
  const codes = db.collection<OtpCode>(OTP_COLLECTION);
  const hourAgo = new Date(Date.now() - 3600_000);

  const last = await codes.findOne({ phone }, { sort: { createdAt: -1 } });
  if (last) {
    const sinceSec = Math.floor((Date.now() - last.createdAt.getTime()) / 1000);
    if (sinceSec < OTP_RESEND_COOLDOWN_SEC) {
      throw new OtpError(
        'Код уже надіслано. Зачекайте трохи, перш ніж просити новий',
        429,
        'too-soon',
        OTP_RESEND_COOLDOWN_SEC - sinceSec
      );
    }
  }

  const perPhone = await codes.countDocuments({ phone, createdAt: { $gte: hourAgo } });
  if (perPhone >= OTP_MAX_PER_PHONE_HOUR) {
    throw new OtpError(
      'Забагато спроб для цього номера. Спробуйте за годину або зателефонуйте нам',
      429,
      'phone-limit'
    );
  }

  // Ліміт на адресу — від перебору чужих номерів з одного місця: саме так
  // накручують SMS-трафік чужим коштом.
  if (ip) {
    const perIp = await codes.countDocuments({ ip, createdAt: { $gte: hourAgo } });
    if (perIp >= OTP_MAX_PER_IP_HOUR) {
      throw new OtpError('Забагато запитів. Спробуйте пізніше', 429, 'ip-limit');
    }
  }
}

export async function requestCode(
  db: Db,
  userId: string,
  rawPhone: string,
  options: { ip?: string; channel?: OtpChannel } = {}
): Promise<RequestCodeResult> {
  if (!ObjectId.isValid(userId)) {
    throw new OtpError('Користувача не знайдено', 404, 'no-user');
  }

  const phone = requirePhone(rawPhone);
  const users = db.collection<User>(USER_COLLECTION);
  const _id = new ObjectId(userId);

  const user = await users.findOne({ _id });
  if (!user) {
    throw new OtpError('Користувача не знайдено', 404, 'no-user');
  }
  if (user.phoneVerifiedAt && user.phoneNumber === phone) {
    throw new OtpError('Цей номер уже підтверджено', 409, 'already-verified');
  }

  // Номер не має бути чужим: інакше підтвердження стало б способом забрати
  // доступ до картки клієнта, який уже зареєстрований.
  const taken = await users.findOne({ phoneNumber: phone, _id: { $ne: _id } });
  if (taken) {
    throw new OtpError(
      'Цей номер уже належить іншому акаунту. Зателефонуйте нам, і ми розберемось',
      409,
      'phone-taken'
    );
  }

  await assertLimits(db, phone, options.ip);

  const picked = options.channel
    ? await senderByChannel(options.channel)
    : await pickSender(phone);

  if (!picked) {
    throw new OtpError('Не вдалося надіслати код. Зателефонуйте нам', 502, 'no-channel');
  }

  const code = generateCode();
  const { sender, requestId } = picked;
  const result = await sender.send(phone, code, requestId);

  if (!result.ok) {
    throw new OtpError('Не вдалося надіслати код. Спробуйте ще раз', 502, 'send-failed');
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + config.otpTtlMinutes * 60_000);

  // Попередні коди цього номера гасимо: діє лише останній.
  await db
    .collection<OtpCode>(OTP_COLLECTION)
    .updateMany({ phone, consumedAt: { $exists: false } }, { $set: { consumedAt: now } });

  await db.collection<OtpCode>(OTP_COLLECTION).insertOne({
    userId: _id,
    phone,
    codeHash: await hashPassword(code),
    channel: sender.channel,
    attempts: 0,
    createdAt: now,
    expiresAt,
    ...(result.requestId ?? requestId ? { requestId: result.requestId ?? requestId } : {}),
    ...(options.ip ? { ip: options.ip } : {}),
  });

  logger.info('Код підтвердження надіслано', { userId, channel: sender.channel });

  return {
    channel: sender.channel,
    phone,
    expiresAt,
    resendAfterSec: OTP_RESEND_COOLDOWN_SEC,
  };
}

export interface VerifyResult {
  phone: string;
  /**
   * Що сталося з карткою клієнта: знайшли наявну (тоді в кабінеті одразу буде
   * історія), завели нову, або картка на цей номер уже закріплена за іншим
   * акаунтом — останнє вирішується лише вручну.
   */
  outcome: LinkOutcome;
}

export async function verifyCode(db: Db, userId: string, rawCode: string): Promise<VerifyResult> {
  if (!ObjectId.isValid(userId)) {
    throw new OtpError('Користувача не знайдено', 404, 'no-user');
  }

  const code = String(rawCode ?? '').trim();
  if (!/^\d{6}$/.test(code)) {
    throw new OtpError('Код складається з шести цифр', 400, 'bad-code');
  }

  const codes = db.collection<OtpCode>(OTP_COLLECTION);
  const _id = new ObjectId(userId);

  const record = await codes.findOne(
    { userId: _id, consumedAt: { $exists: false } },
    { sort: { createdAt: -1 } }
  );

  if (!record) {
    throw new OtpError('Код не знайдено. Надішліть новий', 400, 'no-code');
  }
  if (record.expiresAt.getTime() < Date.now()) {
    throw new OtpError('Код застарів. Надішліть новий', 400, 'expired');
  }
  if (record.attempts >= OTP_MAX_ATTEMPTS) {
    throw new OtpError('Забагато спроб. Надішліть новий код', 429, 'too-many-attempts');
  }

  if (!(await verifyPassword(code, record.codeHash))) {
    // Лічильник рухаємо до відповіді, інакше перебір коштував би лише часу.
    await codes.updateOne({ _id: record._id! }, { $inc: { attempts: 1 } });
    const left = OTP_MAX_ATTEMPTS - record.attempts - 1;
    throw new OtpError(
      left > 0 ? `Невірний код. Залишилось спроб: ${left}` : 'Невірний код. Надішліть новий',
      400,
      'wrong-code'
    );
  }

  await codes.updateOne({ _id: record._id! }, { $set: { consumedAt: new Date() } });

  const users = db.collection<User>(USER_COLLECTION);
  await users.updateOne(
    { _id },
    { $set: { phoneNumber: record.phone, phoneVerifiedAt: new Date() } }
  );

  const outcome = await AuthService.linkVerifiedPhone(db, _id, record.phone);

  logger.info('Телефон підтверджено', { userId, outcome });

  return { phone: record.phone, outcome };
}
