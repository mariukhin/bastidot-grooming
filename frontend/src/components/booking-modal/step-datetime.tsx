import { Dayjs } from 'dayjs';
import classNames from 'classnames';

import { Button } from '@/components/button';
import { Icon, IconTypes } from '@/components/icon';
import { BreedProps, ServiceProps } from '@/utils/function';
import { Groomer, TimeSlotPeriod } from './types';
import { generateTimeSlots } from './utils';
import SummaryCard from './summary-card';

import styles from './booking-modal.module.scss';

type StepDatetimeProps = {
  selectedDate: Dayjs;
  selectedSlot: string | null;
  weekDates: Dayjs[];
  timeSlots: TimeSlotPeriod[];
  now: Dayjs;
  onSelectDate: (date: Dayjs) => void;
  onSelectSlot: (slot: string) => void;
  onWeekOffsetChange: (updater: (prev: number) => number) => void;
  onNext: () => void;
  selectedServices: ServiceProps[];
  selectedBreed: BreedProps | null;
  selectedGroomer: Groomer | null;
  formattedDateTime: string | null;
  isSummaryExpanded: boolean;
  onToggleSummary: () => void;
};

const StepDatetime = ({
  selectedDate,
  selectedSlot,
  weekDates,
  timeSlots,
  now,
  onSelectDate,
  onSelectSlot,
  onWeekOffsetChange,
  onNext,
  selectedServices,
  selectedBreed,
  selectedGroomer,
  formattedDateTime,
  isSummaryExpanded,
  onToggleSummary,
}: StepDatetimeProps) => (
  <div className={styles.stepContainer}>
    <h2 className={styles.title}>Оберіть дату та час</h2>

    <div className={classNames(styles.section, styles.sectionGrow)}>
      <div className={styles.weekHeader}>
        <button
          type="button"
          className={styles.weekNavButton}
          onClick={() => onWeekOffsetChange((prev) => prev - 1)}
          aria-label="Попередній тиждень"
        >
          <Icon id={IconTypes.chevronLeft} width={18} height={18} />
        </button>
        <p className={styles.weekHeaderLabel}>{selectedDate.format('dddd, D MMMM')}</p>
        <button
          type="button"
          className={styles.weekNavButton}
          onClick={() => onWeekOffsetChange((prev) => prev + 1)}
          aria-label="Наступний тиждень"
        >
          <Icon id={IconTypes.chevroneRight} width={18} height={18} />
        </button>
      </div>

      <ul className={styles.weekStrip}>
        {weekDates.map((date) => {
          const isSelected = date.isSame(selectedDate, 'day');
          const isPast = date.isBefore(now, 'day');
          const hasNoSlots =
            !isPast && generateTimeSlots(date, now).every((p) => p.slots.length === 0);
          const isDisabled = isPast || hasNoSlots;
          return (
            <li
              key={date.toISOString()}
              className={classNames(styles.dayCard, {
                [styles.dayCardSelected]: isSelected,
                [styles.dayCardDisabled]: isDisabled,
              })}
              onClick={() => {
                if (isDisabled) return;
                onSelectDate(date);
              }}
            >
              <p className={styles.dayCardWeekday}>{date.format('dd')}</p>
              <p className={styles.dayCardDate}>{date.format('D')}</p>
              <p className={styles.dayCardMonth}>{date.format('MMM')}</p>
            </li>
          );
        })}
      </ul>

      <div className={styles.slotsScroll}>
        {timeSlots.map(({ period, slots }) => (
          <div key={period} className={styles.slotsSection}>
            <p className={styles.periodLabel}>{period}</p>
            <ul className={styles.slotsGrid}>
              {slots.map((slot) => (
                <li
                  key={slot}
                  className={classNames(styles.slotButton, {
                    [styles.slotButtonSelected]: selectedSlot === slot,
                  })}
                  onClick={() => onSelectSlot(slot)}
                >
                  {slot}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>

    <div className={styles.footer}>
      <SummaryCard
        selectedServices={selectedServices}
        selectedBreed={selectedBreed}
        selectedGroomer={selectedGroomer}
        formattedDateTime={formattedDateTime}
        isSummaryExpanded={isSummaryExpanded}
        onToggle={onToggleSummary}
      >
        <Button text="Далі" size="large" disabled={!selectedSlot} onClick={onNext} />
      </SummaryCard>
    </div>
  </div>
);

export default StepDatetime;
