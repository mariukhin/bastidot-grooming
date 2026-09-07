export interface NormalizedPhone {
  phone: string;
  phoneRaw: string;
  isForeign: boolean;
}

export function normalizePhone(raw: string): NormalizedPhone | null {
  const digits = String(raw ?? '').replace(/\D/g, '');

  if (digits.length === 10 && digits.startsWith('0')) {
    return { phone: '+38' + digits, phoneRaw: digits, isForeign: false };
  }

  if (digits.length === 12 && digits.startsWith('380')) {
    return { phone: '+' + digits, phoneRaw: '0' + digits.slice(3), isForeign: false };
  }

  if (digits.length === 9) {
    return { phone: '+380' + digits, phoneRaw: '0' + digits, isForeign: false };
  }

  if (digits.length >= 10) {
    return { phone: '+' + digits, phoneRaw: digits, isForeign: true };
  }

  return null;
}
