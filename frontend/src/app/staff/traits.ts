import type { PetTraitValue } from '@/api/staff';

/** Від цього рівня шкала стає попередженням, а не просто характеристикою. */
export const ALARM_LEVEL = 8;

export const alarmingTraits = (traits?: PetTraitValue[]): PetTraitValue[] =>
  (traits ?? []).filter((trait) => trait.value >= ALARM_LEVEL);

/** «Боїться фену» + 9 → «Сильно боїться фену (9/10)». */
export const alarmText = (trait: PetTraitValue): string =>
  `Сильно ${trait.label.charAt(0).toLowerCase()}${trait.label.slice(1)} (${trait.value}/10)`;

export type TraitLevel = 'calm' | 'mid' | 'alarm';

export const traitLevel = (value: number): TraitLevel => {
  if (value >= ALARM_LEVEL) return 'alarm';
  return value >= 4 ? 'mid' : 'calm';
};
