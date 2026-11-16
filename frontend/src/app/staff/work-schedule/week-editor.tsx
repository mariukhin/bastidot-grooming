'use client';

import classNames from 'classnames';

import { Icon, IconTypes } from '@/components/icon';

import { TimeRangeInputs } from './sheets';
import { WEEKDAY_LONG, WEEKDAY_SHORT, rowError, suggestBreak, type WeekRow } from './utils';
import styles from './work-schedule.module.scss';

type WeekEditorProps = {
  rows: WeekRow[];
  onChange: (rows: WeekRow[]) => void;
  /** Показувати «+ перерва». Самі перерви зберігаються завжди, навіть без кнопки. */
  allowBreaks?: boolean;
};

/** «Типовий тиждень»: 7 рядків з перемикачем, годинами (крок 15 хв) і перервами. */
const WeekEditor = ({ rows, onChange, allowBreaks = false }: WeekEditorProps) => {
  const update = (weekday: number, patch: Partial<WeekRow>) =>
    onChange(rows.map((r) => (r.weekday === weekday ? { ...r, ...patch } : r)));

  return (
    <ul className={styles.week}>
      {rows.map((row) => {
        const name = WEEKDAY_LONG[row.weekday]!;
        const error = rowError(row);

        return (
          <li key={row.weekday} className={styles.weekRow}>
            <label className={styles.switch}>
              <input
                type="checkbox"
                checked={row.enabled}
                onChange={(e) => update(row.weekday, { enabled: e.target.checked })}
              />
              <span className={styles.switchTrack} aria-hidden="true" />
              {/* Скорочено скрізь: так години мають місце, а скрінрідер читає повну назву. */}
              <span className={styles.weekName}>
                <span className={styles.srOnly}>{name}</span>
                <span aria-hidden="true">{WEEKDAY_SHORT[(row.weekday + 6) % 7]}</span>
              </span>
            </label>

            {row.enabled ? (
              <TimeRangeInputs
                from={row.from}
                to={row.to}
                label={name}
                onChange={(next) => update(row.weekday, next)}
              />
            ) : (
              <span className={styles.weekOff}>Вихідний</span>
            )}

            {row.enabled &&
              row.breaks.map((b, i) => (
                <div key={i} className={styles.breakRow}>
                  <span className={styles.breakLabel}>перерва</span>
                  <TimeRangeInputs
                    from={b.from}
                    to={b.to}
                    label={`${name}, перерва ${i + 1}`}
                    onChange={(next) =>
                      update(row.weekday, {
                        breaks: row.breaks.map((x, j) => (j === i ? next : x)),
                      })
                    }
                  />
                  <button
                    type="button"
                    className={styles.breakRemove}
                    aria-label={`Прибрати перерву ${i + 1}, ${name}`}
                    onClick={() =>
                      update(row.weekday, { breaks: row.breaks.filter((_, j) => j !== i) })
                    }
                  >
                    <Icon id={IconTypes.close} width={14} height={14} />
                  </button>
                </div>
              ))}

            {row.enabled && allowBreaks && (
              <button
                type="button"
                className={classNames(styles.addBreak)}
                onClick={() => update(row.weekday, { breaks: [...row.breaks, suggestBreak(row)] })}
              >
                + перерва
              </button>
            )}

            {error && <p className={classNames(styles.sheetError, styles.rowError)}>{error}</p>}
          </li>
        );
      })}
    </ul>
  );
};

export default WeekEditor;
