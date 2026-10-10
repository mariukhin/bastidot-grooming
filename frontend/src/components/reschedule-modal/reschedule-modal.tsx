'use client';

import { useEffect, useMemo, useState } from 'react';
import dayjs, { type Dayjs } from 'dayjs';

import { Modal } from '@/components/modal';
import StepDatetime from '@/components/booking-modal/step-datetime';
import StepCancelled from '@/components/booking-modal/step-cancelled';
import type { BusySlot, Groomer } from '@/components/booking-modal/types';
import { capitalize, generateTimeSlots, generateWeekDates } from '@/components/booking-modal/utils';
import { getBusySlots, rescheduleOrder } from '@/api/order';
import type { AccountVisit } from '@/api/account';
import type { ServiceProps } from '@/utils/function';

type RescheduleModalProps = {
  visit: AccountVisit;
  onClose: () => void;
  onDone: () => void;
};

/**
 * Збирає з даних візиту обʼєкти, яких чекає SummaryCard.
 *
 * Ціна у відповіді вже порахована з урахуванням VIP, тож грумера позначаємо
 * звичайним і кладемо суму в defaultPrice — інакше підсумок порахувався б удруге.
 */
const toSummaryServices = (visit: AccountVisit): ServiceProps[] =>
  visit.services.map((service, index) => ({
    id: service.id,
    type: service.name,
    defaultPrice: service.price,
    vipPrice: service.price,
    // Тривалість у записі одна на весь візит, по послугах її немає — кладемо
    // цілком у першу, щоб підсумок показав правильний час.
    durationHour: index === 0 ? Math.floor(visit.durationMinutes / 60) : 0,
    durationMin: index === 0 ? visit.durationMinutes % 60 : 0,
  })) as unknown as ServiceProps[];

const toSummaryGroomer = (visit: AccountVisit): Groomer | null =>
  visit.groomer
    ? {
        id: visit.groomer.id,
        name: visit.groomer.name,
        isVip: false,
        photoSrc: visit.groomer.photoUrl ?? '',
        nearestDate: null,
      }
    : null;

const RescheduleModal = ({ visit, onClose, onDone }: RescheduleModalProps) => {
  const now = useMemo(() => dayjs(), []);
  const current = useMemo(() => dayjs(visit.scheduledAt), [visit.scheduledAt]);

  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState<Dayjs>(current);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [busySlots, setBusySlots] = useState<BusySlot[]>([]);
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(true);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const weekDates = useMemo(
    () => generateWeekDates(selectedDate.startOf('week').add(weekOffset, 'week')),
    [selectedDate, weekOffset]
  );

  const timeSlots = useMemo(
    () => generateTimeSlots(selectedDate, now, visit.durationMinutes, busySlots),
    [selectedDate, now, visit.durationMinutes, busySlots]
  );

  // Зайнятий час того самого грумера; власний запис бекенд із перевірки виключає,
  // тож поточний слот лишається доступним.
  useEffect(() => {
    const groomerId = visit.groomer?.id;
    if (!groomerId) return;

    let cancelled = false;
    const from = weekDates[0]!.format('YYYY-MM-DD');
    const to = weekDates[weekDates.length - 1]!.format('YYYY-MM-DD');

    void getBusySlots(groomerId, from, to).then((result) => {
      if (!cancelled) setBusySlots(Array.isArray(result) ? result : []);
    });

    return () => {
      cancelled = true;
    };
  }, [visit.groomer?.id, weekDates]);

  const formattedDateTime = selectedSlot
    ? `${capitalize(selectedDate.format('dddd D MMMM'))}, ${selectedSlot}`
    : null;

  const submit = async () => {
    if (!selectedSlot) return;

    const [hour, minute] = selectedSlot.split(':').map(Number);
    const startAt = selectedDate.hour(hour!).minute(minute!).second(0);

    setIsPending(true);
    setError(null);
    const result = await rescheduleOrder(
      visit.id,
      '',
      startAt.toISOString(),
      visit.durationMinutes
    );
    setIsPending(false);

    if (result.ok) {
      onDone();
    } else {
      setError(result.message);
    }
  };

  return (
    <Modal isOpen onClose={onClose} label="Перенести візит">
      <StepDatetime
        selectedDate={selectedDate}
        selectedSlot={selectedSlot}
        weekDates={weekDates}
        timeSlots={timeSlots}
        now={now}
        onSelectDate={(date) => {
          setSelectedDate(date);
          setSelectedSlot(null);
        }}
        onSelectSlot={setSelectedSlot}
        onWeekOffsetChange={setWeekOffset}
        onNext={() => void submit()}
        selectedServices={toSummaryServices(visit)}
        selectedExtraServices={[]}
        selectedGroomer={toSummaryGroomer(visit)}
        formattedDateTime={formattedDateTime}
        isSummaryExpanded={isSummaryExpanded}
        onToggleSummary={() => setIsSummaryExpanded((prev) => !prev)}
        durationMinutes={visit.durationMinutes}
        nextLabel="Перенести візит"
        isNextPending={isPending}
        errorMessage={error}
      />
    </Modal>
  );
};

export const CancelledModal = ({
  formattedDateTimeRange,
  onClose,
}: {
  formattedDateTimeRange: string | null;
  onClose: () => void;
}) => (
  <Modal isOpen onClose={onClose} label="Запис скасовано" fitContent>
    <StepCancelled formattedDateTimeRange={formattedDateTimeRange} onBookAgain={onClose} />
  </Modal>
);

export default RescheduleModal;
