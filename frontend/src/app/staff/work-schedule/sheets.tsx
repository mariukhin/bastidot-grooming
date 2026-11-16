'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import classNames from 'classnames';

import { Button } from '@/components/button';
import { Icon, IconTypes } from '@/components/icon';
import { useFocusTrapping } from '@/hooks/use-focus-trapping';
import { EXCEPTION_LABEL, type ExceptionInput, type ScheduleException } from '@/api/staff';

import {
  formatDay,
  formatRange,
  isRange,
  ordersWord,
  validRange,
  DEFAULT_HOURS,
  type DayInfo,
} from './utils';
import styles from './work-schedule.module.scss';

type SheetProps = {
  title: string;
  onClose: () => void;
  children: ReactNode;
};

/** Панель знизу на телефоні, діалог по центру на десктопі. */
export const BottomSheet = ({ title, onClose, children }: SheetProps) => {
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrapping({ ref, open: true, onEscape: onClose });

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div
        ref={ref}
        className={styles.sheet}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        <span className={styles.sheetHandle} aria-hidden="true" />
        <div className={styles.sheetHead}>
          <h3 className={styles.sheetTitle}>{title}</h3>
          <button
            type="button"
            className={styles.sheetClose}
            onClick={onClose}
            aria-label="Закрити"
          >
            <Icon id={IconTypes.close} width={18} height={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

type TimeRangeProps = {
  from: string;
  to: string;
  onChange: (next: { from: string; to: string }) => void;
  label: string;
};

export const TimeRangeInputs = ({ from, to, onChange, label }: TimeRangeProps) => (
  <span className={styles.timeRange}>
    <input
      type="time"
      className={styles.timeInput}
      value={from}
      step={900}
      aria-label={`${label}: з`}
      onChange={(e) => onChange({ from: e.target.value, to })}
    />
    <span aria-hidden="true">–</span>
    <input
      type="time"
      className={styles.timeInput}
      value={to}
      step={900}
      aria-label={`${label}: до`}
      onChange={(e) => onChange({ from, to: e.target.value })}
    />
  </span>
);

export type DayChoice = 'weekly' | 'custom_hours' | 'day_off' | 'vacation';

const CHOICES: { value: DayChoice; label: string }[] = [
  { value: 'weekly', label: 'За типовим графіком' },
  { value: 'custom_hours', label: 'Інші години' },
  { value: 'day_off', label: 'Вихідний' },
  { value: 'vacation', label: 'Відпустка' },
];

type DaySheetProps = {
  day: DayInfo;
  /** Активні записи грумера на цей день; null — ще рахуємо. */
  ordersCount: number | null;
  isGroomer: boolean;
  busy: boolean;
  onClose: () => void;
  onSave: (choice: DayChoice, hours: { from: string; to: string }) => void;
  onRemoveRange: (exception: ScheduleException) => void;
};

const initialChoice = (day: DayInfo): DayChoice => {
  const type = day.exception?.type;
  if (!type) return 'weekly';
  return type === 'sick' ? 'vacation' : type;
};

export const DaySheet = ({
  day,
  ordersCount,
  isGroomer,
  busy,
  onClose,
  onSave,
  onRemoveRange,
}: DaySheetProps) => {
  const [choice, setChoice] = useState<DayChoice>(initialChoice(day));
  const [hours, setHours] = useState(day.intervals[0] ?? DEFAULT_HOURS);

  // День усередині багатоденної відпустки окремо не міняємо: незрозуміло,
  // чи ділити діапазон на два. Пропонуємо прибрати його цілком.
  const range = day.exception && isRange(day.exception) ? day.exception : null;
  const changed = choice !== initialChoice(day) || choice === 'custom_hours';
  const hoursOk = choice !== 'custom_hours' || validRange(hours.from, hours.to);

  return (
    <BottomSheet title={formatDay(day.date)} onClose={onClose}>
      {range ? (
        <>
          <p className={styles.sheetText}>
            Цей день входить у «{EXCEPTION_LABEL[range.type]}» {formatRange(range)}. Щоб змінити
            окремий день, спершу приберіть увесь діапазон.
          </p>
          <div className={styles.sheetActions}>
            <Button
              type="button"
              variant="secondary"
              text={`Прибрати «${EXCEPTION_LABEL[range.type]}» ${formatRange(range)}`}
              disabled={busy}
              block
              onClick={() => onRemoveRange(range)}
            />
          </div>
        </>
      ) : (
        <>
          <div className={styles.choices} role="radiogroup" aria-label="Тип дня">
            {CHOICES.map(({ value, label }) => (
              <label
                key={value}
                className={classNames(styles.choice, choice === value && styles.choiceActive)}
              >
                <input
                  type="radio"
                  name="day-choice"
                  value={value}
                  checked={choice === value}
                  onChange={() => setChoice(value)}
                />
                <span className={classNames(styles.swatch, styles[`swatch_${value}`])} />
                <span className={styles.choiceLabel}>{label}</span>
                {value === 'custom_hours' && choice === 'custom_hours' && (
                  <TimeRangeInputs
                    from={hours.from}
                    to={hours.to}
                    onChange={setHours}
                    label="Інші години"
                  />
                )}
              </label>
            ))}
          </div>

          {!hoursOk && <p className={styles.sheetError}>Початок має бути раніше за кінець.</p>}

          {changed && ordersCount !== null && ordersCount > 0 && (
            <p className={styles.warning} role="alert">
              На цей день уже {ordersWord(ordersCount)}. Якщо вони не вмістяться в нові години,
              адміністратор отримає подію «Перенести».
            </p>
          )}

          {isGroomer && changed && (
            <p className={styles.sheetHint}>Адміністратор отримає сповіщення про зміну.</p>
          )}

          <div className={styles.sheetActions}>
            <Button
              type="button"
              text={busy ? 'Зберігаємо…' : 'Зберегти'}
              disabled={busy || !changed || !hoursOk}
              block
              onClick={() => onSave(choice, hours)}
            />
          </div>
        </>
      )}
    </BottomSheet>
  );
};

type RangeSheetProps = {
  initialDate: string;
  isGroomer: boolean;
  busy: boolean;
  onClose: () => void;
  onSave: (input: ExceptionInput) => void;
  /** Адмін може задати й «інші години» на діапазон; грумер — лише відсутність. */
  withCustomHours?: boolean;
};

type RangeType = 'vacation' | 'sick' | 'custom_hours';

export const RangeSheet = ({
  initialDate,
  isGroomer,
  busy,
  onClose,
  onSave,
  withCustomHours = false,
}: RangeSheetProps) => {
  const types: RangeType[] = withCustomHours
    ? ['vacation', 'sick', 'custom_hours']
    : ['vacation', 'sick'];
  const [type, setType] = useState<RangeType>('vacation');
  const [hours, setHours] = useState(DEFAULT_HOURS);
  const [dateFrom, setDateFrom] = useState(initialDate);
  const [dateTo, setDateTo] = useState(initialDate);
  const [note, setNote] = useState('');

  const datesOk = Boolean(dateFrom && dateTo && dateFrom <= dateTo);
  const hoursOk = type !== 'custom_hours' || validRange(hours.from, hours.to);
  const valid = datesOk && hoursOk;

  return (
    <BottomSheet
      title={withCustomHours ? 'Відпустка, лікарняний або інші години' : 'Відпустка або лікарняний'}
      onClose={onClose}
    >
      <div
        className={classNames(styles.segmented, types.length === 3 && styles.segmented3)}
        role="radiogroup"
        aria-label="Тип"
      >
        {types.map((value) => (
          <label
            key={value}
            className={classNames(styles.segment, type === value && styles.segmentActive)}
          >
            <input
              type="radio"
              name="range-type"
              checked={type === value}
              onChange={() => setType(value)}
            />
            {EXCEPTION_LABEL[value]}
          </label>
        ))}
      </div>

      <div className={styles.dates}>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>З</span>
          <input
            type="date"
            className={styles.dateInput}
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              if (e.target.value > dateTo) setDateTo(e.target.value);
            }}
          />
        </label>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>По</span>
          <input
            type="date"
            className={styles.dateInput}
            value={dateTo}
            min={dateFrom}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </label>
      </div>

      <label className={styles.field}>
        <span className={styles.fieldLabel}>Коментар (необовʼязково)</span>
        <input
          type="text"
          className={styles.textInput}
          value={note}
          maxLength={200}
          onChange={(e) => setNote(e.target.value)}
        />
      </label>

      {type === 'custom_hours' && (
        <div className={styles.field}>
          <span className={styles.fieldLabel}>Години в кожен із цих днів</span>
          <TimeRangeInputs
            from={hours.from}
            to={hours.to}
            onChange={setHours}
            label="Інші години"
          />
        </div>
      )}

      {!datesOk && <p className={styles.sheetError}>Дата «по» не може бути раніше за «з».</p>}
      {!hoursOk && <p className={styles.sheetError}>Початок має бути раніше за кінець.</p>}

      <p className={styles.sheetHint}>
        Записи на ці дні не скасуються: адміністратор побачить, скільки їх треба перенести.
        {isGroomer && ' Він також отримає сповіщення.'}
      </p>

      <div className={styles.sheetActions}>
        <Button
          type="button"
          text={busy ? 'Зберігаємо…' : 'Зберегти'}
          disabled={busy || !valid}
          block
          onClick={() =>
            onSave({
              type,
              dateFrom,
              dateTo,
              ...(type === 'custom_hours' ? hours : {}),
              ...(note.trim() ? { note: note.trim() } : {}),
            })
          }
        />
      </div>
    </BottomSheet>
  );
};
