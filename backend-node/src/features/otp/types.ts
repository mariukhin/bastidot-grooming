import type { ObjectId } from 'mongodb';

export const OTP_COLLECTION = 'otp_code';

export type OtpChannel = 'telegram' | 'sms' | 'log';

export interface OtpCode {
  _id?: ObjectId;
  userId: ObjectId;
  phone: string;
  codeHash: string;
  channel: OtpChannel;
  attempts: number;
  createdAt: Date;
  expiresAt: Date;
  consumedAt?: Date;
  requestId?: string;
  ip?: string;
}


export const OTP_MAX_ATTEMPTS = 5;
export const OTP_MAX_PER_PHONE_HOUR = 3;
export const OTP_MAX_PER_IP_HOUR = 10;
export const OTP_RESEND_COOLDOWN_SEC = 60;
export const OTP_RETENTION_SEC = 3600;
