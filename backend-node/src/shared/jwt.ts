import { createHmac, timingSafeEqual } from 'node:crypto';

interface JwtHeader {
  alg: 'HS256';
  typ: 'JWT';
}

export interface JwtPayload {
  [key: string]: unknown;
  iat?: number; // issued at
  exp?: number; // expires at
}

const HEADER: JwtHeader = { alg: 'HS256', typ: 'JWT' };

function base64urlEncode(data: string): string {
  return Buffer.from(data, 'utf8').toString('base64url');
}

function base64urlDecode(segment: string): string {
  return Buffer.from(segment, 'base64url').toString('utf8');
}

function sign(headerAndPayload: string, secret: string): string {
  return createHmac('sha256', secret).update(headerAndPayload).digest('base64url');
}

export function signToken(
  payload: JwtPayload,
  secret: string,
  expiresInSeconds: number
): string {
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: JwtPayload = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds,
  };

  const headerB64 = base64urlEncode(JSON.stringify(HEADER));
  const payloadB64 = base64urlEncode(JSON.stringify(fullPayload));
  const signature = sign(`${headerB64}.${payloadB64}`, secret);

  return `${headerB64}.${payloadB64}.${signature}`;
}

export function verifyToken(token: string, secret: string): JwtPayload {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Malformed token');
  }
  const [headerB64, payloadB64, signatureB64] = parts as [string, string, string];

  const expectedSignature = sign(`${headerB64}.${payloadB64}`, secret);
  const given = Buffer.from(signatureB64, 'base64url');
  const expected = Buffer.from(expectedSignature, 'base64url');

  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    throw new Error('Invalid signature');
  }

  const payload = JSON.parse(base64urlDecode(payloadB64)) as JwtPayload;

  if (typeof payload.exp === 'number') {
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) {
      throw new Error('Token expired');
    }
  }

  return payload;
}
