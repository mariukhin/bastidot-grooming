'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import classNames from 'classnames';

import { fetchAllBreeds, searchBreeds, type BreedOption } from '@/api/account';

import styles from './breed-combobox.module.scss';

export const MIXED_BREED_LABEL = 'Метис / безпородний';
const CAT_BREED_NAME = 'Кіт';

export type BreedChoice =
  { kind: 'breed'; id: string; name: string } | { kind: 'custom'; name: string } | null;

type BreedComboboxProps = {
  value: BreedChoice;
  onChange: (choice: BreedChoice) => void;
  error?: string;
  required?: boolean;
};

type Item =
  | { type: 'breed'; id: string; name: string }
  | { type: 'mixed' }
  | { type: 'custom'; name: string };

const choiceLabel = (value: BreedChoice): string => {
  if (!value) return '';
  return value.name;
};

const BreedCombobox = ({ value, onChange, error, required }: BreedComboboxProps) => {
  const [query, setQuery] = useState(() => choiceLabel(value));
  const [breeds, setBreeds] = useState<BreedOption[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();
  const inputId = useId();

  // Коли значення прийшло ззовні (відкрили редагування) — показуємо його в полі.
  useEffect(() => {
    setQuery(choiceLabel(value));
  }, [value]);

  useEffect(() => {
    let cancelled = false;
    const trimmed = query.trim();

    const load = trimmed === '' ? fetchAllBreeds() : searchBreeds(trimmed);
    // Невелика затримка, щоб не слати запит на кожну літеру.
    const timer = setTimeout(() => {
      void load.then((result) => {
        if (!cancelled && result) setBreeds(result);
      });
    }, 180);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  useEffect(() => {
    if (!isOpen) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [isOpen]);

  const items = useMemo<Item[]>(() => {
    const trimmed = query.trim();
    // «Кіт» завжди нагорі: це окремий вид, і шукати його серед собачих порід
    // за алфавітом незручно. Бекенд закріплює його лише у відповіді на ?q=,
    // тож для порожнього запиту робимо це тут — щоб правило було одне на обидва шляхи.
    const list: Item[] = breeds
      .map((breed) => ({ type: 'breed' as const, id: breed.id, name: breed.name }))
      .sort((x, y) => Number(y.name === CAT_BREED_NAME) - Number(x.name === CAT_BREED_NAME));

    const exact = list.some(
      (item) => item.type === 'breed' && item.name.toLowerCase() === trimmed.toLowerCase()
    );

    list.push({ type: 'mixed' });
    // «Додати…» лише коли введене щось своє і точного збігу немає.
    if (trimmed !== '' && !exact) {
      list.push({ type: 'custom', name: trimmed });
    }
    return list;
  }, [breeds, query]);

  useEffect(() => {
    setActiveIndex(0);
  }, [items.length]);

  const pick = (item: Item) => {
    if (item.type === 'breed') {
      onChange({ kind: 'breed', id: item.id, name: item.name });
      setQuery(item.name);
    } else if (item.type === 'mixed') {
      onChange({ kind: 'custom', name: MIXED_BREED_LABEL });
      setQuery(MIXED_BREED_LABEL);
    } else {
      onChange({ kind: 'custom', name: item.name });
      setQuery(item.name);
    }
    setIsOpen(false);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        return;
      }
      const delta = event.key === 'ArrowDown' ? 1 : -1;
      setActiveIndex((prev) => (prev + delta + items.length) % items.length);
      return;
    }

    if (event.key === 'Enter' && isOpen) {
      const item = items[activeIndex];
      if (item) {
        event.preventDefault();
        pick(item);
      }
      return;
    }

    if (event.key === 'Escape' && isOpen) {
      event.preventDefault();
      setIsOpen(false);
    }
  };

  return (
    <div className={styles.wrapper} ref={wrapperRef}>
      <label className={styles.label} htmlFor={inputId}>
        Порода {required && <span aria-hidden="true">*</span>}
      </label>

      <input
        id={inputId}
        className={classNames(styles.input, error && styles.inputError)}
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setIsOpen(true);
          // Поки не обрали варіант зі списку — значення вважається незаданим.
          if (value) onChange(null);
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={onKeyDown}
        placeholder="Почніть вводити породу"
        autoComplete="off"
        role="combobox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={isOpen ? `${listboxId}-${activeIndex}` : undefined}
        aria-invalid={Boolean(error)}
      />

      {isOpen && items.length > 0 && (
        <ul className={styles.list} id={listboxId} role="listbox">
          {items.map((item, index) => {
            const label =
              item.type === 'breed'
                ? item.name
                : item.type === 'mixed'
                  ? MIXED_BREED_LABEL
                  : `Додати «${item.name}»`;

            return (
              <li
                key={item.type === 'breed' ? item.id : item.type}
                id={`${listboxId}-${index}`}
                role="option"
                aria-selected={index === activeIndex}
                className={classNames(
                  styles.option,
                  index === activeIndex && styles.optionActive,
                  item.type !== 'breed' && styles.optionSpecial
                )}
                onPointerDown={(event) => {
                  event.preventDefault();
                  pick(item);
                }}
                onMouseEnter={() => setActiveIndex(index)}
              >
                {label}
              </li>
            );
          })}
        </ul>
      )}

      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
};

export default BreedCombobox;
