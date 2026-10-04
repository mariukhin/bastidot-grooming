'use client';

import type { PetTrait, PetTraitValue } from '@/api/account';

import styles from './pet-modal.module.scss';

const DEFAULT = 5;

type TraitSlidersProps = {
  traits: PetTrait[];
  values: PetTraitValue[];
  onChange: (next: PetTraitValue[]) => void;
};

export const TraitSliders = ({ traits, values, onChange }: TraitSlidersProps) => {
  if (traits.length === 0) return null;

  const valueOf = (key: string) => values.find((item) => item.traitKey === key)?.value;

  const setValue = (key: string, value: number) => {
    const rest = values.filter((item) => item.traitKey !== key);
    onChange([...rest, { traitKey: key, value }]);
  };

  const clear = (key: string) => onChange(values.filter((item) => item.traitKey !== key));

  return (
    <fieldset className={styles.traits}>
      <legend className={styles.traitsTitle}>Як почувається на грумінгу</legend>

      {traits.map((trait) => {
        const current = valueOf(trait.key);
        const isSet = current !== undefined;

        return (
          <div key={trait.key} className={styles.trait}>
            <div className={styles.traitHead}>
              <span className={styles.traitLabel}>{trait.label}</span>
              {isSet ? (
                <button
                  type="button"
                  className={styles.traitReset}
                  onClick={() => clear(trait.key)}
                >
                  Скинути
                </button>
              ) : (
                <span className={styles.traitUnset}>не вказано</span>
              )}
            </div>

            <input
              className={styles.traitRange}
              type="range"
              min={1}
              max={10}
              step={1}
              value={current ?? DEFAULT}
              onChange={(event) => setValue(trait.key, Number(event.target.value))}
              aria-label={trait.label}
              aria-valuetext={isSet ? `${current} з 10` : 'не вказано, пересуньте щоб оцінити'}
              data-unset={!isSet}
            />

            <div className={styles.traitScale}>
              <span>{trait.minLabel}</span>
              <span className={styles.traitValue}>{isSet ? current : '—'}</span>
              <span>{trait.maxLabel}</span>
            </div>
          </div>
        );
      })}
    </fieldset>
  );
};
