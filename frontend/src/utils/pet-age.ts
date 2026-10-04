export const plural = (count: number, forms: [string, string, string]): string => {
  const mod100 = count % 100;
  const mod10 = count % 10;
  if (mod100 >= 11 && mod100 <= 14) return forms[2];
  if (mod10 === 1) return forms[0];
  if (mod10 >= 2 && mod10 <= 4) return forms[1];
  return forms[2];
};

const YEARS: [string, string, string] = ['рік', 'роки', 'років'];
const MONTHS: [string, string, string] = ['місяць', 'місяці', 'місяців'];

export type PetAge = { years: number; months: number };

export const getPetAge = (birthDate: Date, now: Date = new Date()): PetAge | null => {
  if (Number.isNaN(birthDate.getTime()) || birthDate > now) return null;

  let years = now.getFullYear() - birthDate.getFullYear();
  let months = now.getMonth() - birthDate.getMonth();

  if (now.getDate() < birthDate.getDate()) {
    months -= 1;
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  return { years, months };
};

/** Коротко для картки: «2 р. 3 міс.». */
export const formatAgeShort = (birthDate: Date, now?: Date): string | null => {
  const age = getPetAge(birthDate, now);
  if (!age) return null;

  if (age.years === 0 && age.months === 0) return 'менше місяця';

  return [age.years > 0 ? `${age.years} р.` : '', age.months > 0 ? `${age.months} міс.` : '']
    .filter(Boolean)
    .join(' ');
};

export const formatAgeLong = (birthDate: Date, now?: Date): string | null => {
  const age = getPetAge(birthDate, now);
  if (!age) return null;

  if (age.years === 0 && age.months === 0) return 'Менше місяця';

  return [
    age.years > 0 ? `${age.years} ${plural(age.years, YEARS)}` : '',
    age.months > 0 ? `${age.months} ${plural(age.months, MONTHS)}` : '',
  ]
    .filter(Boolean)
    .join(' ');
};

export const parseDecimal = (value: string): number => Number(value.replace(',', '.').trim());
