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

// Код країни зрізаємо не лише в повного номера: порожнє поле форма зберігає як
// «+380», і без {0,9} ці три цифри поверталися б як національна частина — при
// наступному монтуванні маска показувала б «+380 (38) 0…».
export const extractDigits = (input: string) =>
  input
    .replace(/\D/g, '')
    .replace(/^380(?=\d{0,9}$)/, '')
    .slice(0, 9);

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
