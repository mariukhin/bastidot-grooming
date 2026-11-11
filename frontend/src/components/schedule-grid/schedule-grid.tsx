'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import classNames from 'classnames';

import {
  DEFAULT_FROM,
  DEFAULT_TO,
  STEP_MINUTES,
  TONE_LABEL,
  type GridColumn,
  type GridEvent,
  type TimeRange,
} from './types';
import styles from './schedule-grid.module.scss';

type ScheduleGridProps = {
  /** День, який показуємо, YYYY-MM-DD. */
  date: string;
  columns: GridColumn[];
  events: GridEvent[];
  selectedId?: string | null;
  onSelect?: (event: GridEvent) => void;
  from?: string;
  to?: string;
  /** Висота години в пікселях: від неї залежить уся сітка. */
  hourHeight?: number;
  /** Шапка з колонками: грумеру свій же аватар показувати нема сенсу. */
  showColumnHeads?: boolean;
  /** Тап по вільному місцю колонки: хвилини від початку доби, крок 30. */
  onPickSlot?: (columnId: string, minutes: number) => void;
};

const toMinutes = (time: string): number => {
  const [h, m] = time.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};

const pad = (n: number) => String(n).padStart(2, '0');

const localMinutes = (iso: string): number => {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
};

const todayString = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/** Проміжки поза робочим часом — те, що треба заштрихувати. */
function offHours(
  intervals: TimeRange[],
  from: number,
  to: number
): { top: number; height: number }[] {
  if (intervals.length === 0) return [{ top: from, height: to - from }];

  const sorted = [...intervals].sort((a, b) => toMinutes(a.from) - toMinutes(b.from));
  const gaps: { top: number; height: number }[] = [];
  let cursor = from;

  for (const interval of sorted) {
    const start = Math.max(toMinutes(interval.from), from);
    const end = Math.min(toMinutes(interval.to), to);
    if (start > cursor) gaps.push({ top: cursor, height: start - cursor });
    cursor = Math.max(cursor, end);
  }

  if (cursor < to) gaps.push({ top: cursor, height: to - cursor });
  return gaps;
}

const ScheduleGrid = ({
  date,
  columns,
  events,
  selectedId,
  onSelect,
  from = DEFAULT_FROM,
  to = DEFAULT_TO,
  hourHeight = 96,
  showColumnHeads = true,
  onPickSlot,
}: ScheduleGridProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [nowMinutes, setNowMinutes] = useState<number | null>(null);

  const fromMin = toMinutes(from);
  const toMin = toMinutes(to);
  const perMinute = hourHeight / 60;
  const isToday = date === todayString();

  const rows = useMemo(() => {
    const out: { minutes: number; isHour: boolean }[] = [];
    for (let m = fromMin; m <= toMin; m += STEP_MINUTES) {
      out.push({ minutes: m, isHour: m % 60 === 0 });
    }
    return out;
  }, [fromMin, toMin]);

  // Лінію «зараз» рухаємо щохвилини — частіше немає сенсу, рідше вона бреше.
  useEffect(() => {
    if (!isToday) {
      setNowMinutes(null);
      return;
    }

    const tick = () => {
      const d = new Date();
      setNowMinutes(d.getHours() * 60 + d.getMinutes());
    };

    tick();
    const timer = setInterval(tick, 60_000);
    return () => clearInterval(timer);
  }, [isToday]);

  // При відкритті прокручуємо до поточного часу: день починається не о 10:00,
  // а там, де ти зараз.
  useEffect(() => {
    const box = scrollRef.current;
    if (!box) return;

    const anchor = isToday
      ? new Date().getHours() * 60 + new Date().getMinutes()
      : Math.min(...events.map((e) => localMinutes(e.scheduledAt)), toMin);

    const target = (Math.max(anchor, fromMin) - fromMin) * perMinute - box.clientHeight / 3;
    box.scrollTop = Math.max(0, target);
    // Прокручуємо лише при зміні дня, а не на кожне оновлення подій.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, columns.length]);

  const height = (toMin - fromMin) * perMinute;

  return (
    <div
      className={styles.grid}
      style={{ ['--hour' as string]: `${hourHeight}px` }}
      ref={scrollRef}
    >
      {/* Шапка й тіло загорнуті в один контейнер: він задає спільну ширину,
          інакше кожен рахує свою і колонки розʼїжджаються із заголовками. */}
      <div className={styles.inner}>
        {showColumnHeads && (
          <div className={styles.head}>
            <div className={styles.corner} aria-hidden="true" />
            {columns.map((column) => (
              <div key={column.id} className={styles.headCell}>
                {column.photoUrl ? (
                  <Image
                    className={styles.avatar}
                    src={column.photoUrl}
                    alt=""
                    width={64}
                    height={64}
                  />
                ) : (
                  <span className={styles.avatarFallback} aria-hidden="true">
                    {column.title.trim().charAt(0).toUpperCase()}
                  </span>
                )}
                <span className={styles.headName}>{column.title}</span>
              </div>
            ))}
          </div>
        )}

        <div className={styles.body} style={{ height }}>
          <div className={styles.ruler}>
            {rows.map(({ minutes, isHour }) => (
              <span
                key={minutes}
                className={classNames(styles.tick, isHour ? styles.tickHour : styles.tickHalf)}
                style={{ top: (minutes - fromMin) * perMinute }}
              >
                {isHour ? `${pad(Math.floor(minutes / 60))}:00` : pad(minutes % 60)}
              </span>
            ))}
          </div>

          <div className={styles.columns}>
            {columns.map((column) => (
              <div
                key={column.id}
                className={classNames(styles.column, onPickSlot && styles.columnPickable)}
                onClick={(event) => {
                  // Клік по картці спливає сюди ж — порожнє місце впізнаємо
                  // по тому, що ціль і є сама колонка.
                  if (!onPickSlot || event.target !== event.currentTarget) return;

                  const box = event.currentTarget.getBoundingClientRect();
                  const minutes =
                    fromMin +
                    Math.floor((event.clientY - box.top) / perMinute / STEP_MINUTES) * STEP_MINUTES;
                  onPickSlot(column.id, minutes);
                }}
              >
                {rows.map(({ minutes, isHour }) => (
                  <span
                    key={minutes}
                    className={classNames(styles.line, isHour ? styles.lineHour : styles.lineHalf)}
                    style={{ top: (minutes - fromMin) * perMinute }}
                  />
                ))}

                {offHours(column.intervals, fromMin, toMin).map((gap) => (
                  <span
                    key={`${column.id}-${gap.top}`}
                    className={styles.offHours}
                    style={{ top: (gap.top - fromMin) * perMinute, height: gap.height * perMinute }}
                    aria-hidden="true"
                  />
                ))}

                {events
                  .filter((event) => event.columnId === column.id)
                  .map((event) => {
                    const start = localMinutes(event.scheduledAt);
                    const top = (start - fromMin) * perMinute;
                    const cardHeight = Math.max(event.durationMinutes * perMinute, 28);

                    return (
                      <button
                        key={event.id}
                        type="button"
                        className={classNames(styles.card, styles[`card_${event.tone}`], {
                          [styles.cardSelected]: selectedId === event.id,
                        })}
                        style={{ top, height: cardHeight }}
                        onClick={() => onSelect?.(event)}
                        aria-pressed={selectedId === event.id}
                      >
                        <span className={styles.cardHead}>
                          <span className={styles.cardTime}>
                            {pad(Math.floor(start / 60))}:{pad(start % 60)} –{' '}
                            {pad(Math.floor((start + event.durationMinutes) / 60))}:
                            {pad((start + event.durationMinutes) % 60)}
                          </span>
                          <span
                            className={classNames(styles.cardPill, styles[`pill_${event.tone}`])}
                          >
                            {event.label ?? TONE_LABEL[event.tone]}
                          </span>
                        </span>
                        <span className={styles.cardBody}>{event.content}</span>
                      </button>
                    );
                  })}
              </div>
            ))}

            {nowMinutes !== null && nowMinutes >= fromMin && nowMinutes <= toMin && (
              <div
                className={styles.now}
                style={{ top: (nowMinutes - fromMin) * perMinute }}
                aria-hidden="true"
              >
                <span className={styles.nowLabel}>
                  {pad(Math.floor(nowMinutes / 60))}:{pad(nowMinutes % 60)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScheduleGrid;
