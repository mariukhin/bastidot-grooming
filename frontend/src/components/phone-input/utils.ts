export const MASK = '+380 (__) ___ __ __';

export const applyMask = (digits: string) => {
  let masked = '';
  let digitIndex = 0;

  for (let i = 0; i < MASK.length; i++) {
    if (MASK[i] === '_') {
      masked += digits[digitIndex] ?? '_';
      digitIndex++;
    } else {
      masked += MASK[i];
    }
  }

  return masked;
};

export const extractDigits = (input: string) => input.replace(/\D/g, '').slice(0, 9);

export const getCursorPosFromDigits = (digits: string) => {
  let count = 0;
  for (let i = 0; i < MASK.length; i++) {
    if (MASK[i] === '_') {
      count++;
      if (count > digits.length) return i;
    }
  }
  return MASK.length;
};
