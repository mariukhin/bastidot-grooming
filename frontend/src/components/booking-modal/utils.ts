import dayjs, { Dayjs } from 'dayjs';
import { object, string } from 'yup';
import groomerPreview from '@/components/team-block/groomerPreview.png';
import { BusySlot, Groomer, GroomerDbProps, TimeSlotPeriod } from './types';

const DAY_CLOSE_HOUR = 20;

export const normalizeGroomerList = (groomerList: GroomerDbProps[]): Groomer[] =>
  groomerList.map((groomer) => ({
    id: groomer.id,
    name: groomer.name,
    isVip: groomer.isVip,
    photoSrc: groomer.photoUrl || groomerPreview,
    nearestDate: null,
  }));

export const capitalize = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1);

export const generateWeekDates = (startOfWeek: Dayjs): Dayjs[] =>
  Array.from({ length: 7 }, (_, i) => startOfWeek.add(i, 'day'));

export const generateTimeSlots = (
  date: Dayjs,
  now: Dayjs,
  durationMinutes: number = 15,
  busySlots: BusySlot[] = []
): TimeSlotPeriod[] => {
  const isToday = date.isSame(now, 'day');
  const dayClose = date.hour(DAY_CLOSE_HOUR).minute(0);
  const duration = Math.max(durationMinutes, 15);

  const busyRanges = (Array.isArray(busySlots) ? busySlots : []).map((busy) => {
    const start = dayjs(busy.scheduledAt);
    return { start, end: start.add(busy.durationMinutes, 'minute') };
  });

  const buildRange = (startHour: number, endHour: number) => {
    const slots: string[] = [];
    let cursor = date.hour(startHour).minute(0);
    const end = date.hour(endHour).minute(0);
    while (cursor.isBefore(end)) {
      const slotEnd = cursor.add(duration, 'minute');
      const isPast = isToday && !cursor.isAfter(now);
      const fitsBeforeClose = !slotEnd.isAfter(dayClose);
      const overlapsBusy = busyRanges.some(
        (busy) => cursor.isBefore(busy.end) && slotEnd.isAfter(busy.start)
      );

      if (!isPast && fitsBeforeClose && !overlapsBusy) {
        slots.push(cursor.format('HH:mm'));
      }
      cursor = cursor.add(15, 'minute');
    }
    return slots;
  };

  return [
    { period: 'Ранок', slots: buildRange(9, 12) },
    { period: 'День', slots: buildRange(12, 18) },
    { period: 'Вечір', slots: buildRange(18, 20) },
  ].filter((p) => p.slots.length > 0);
};

// Looks ahead day by day (using the minimal booking granularity as a
// placeholder duration, since at this point no service is selected yet) and
// returns the very first slot that is both free of existing bookings and
// fits before closing time, or null if nothing is free in the window.
export const findNearestAvailableSlot = (
  now: Dayjs,
  busySlots: BusySlot[],
  daysAhead: number = 14,
  durationMinutes: number = 15
): Dayjs | null => {
  for (let i = 0; i < daysAhead; i++) {
    const date = now.startOf('day').add(i, 'day');
    const periods = generateTimeSlots(date, now, durationMinutes, busySlots);
    const firstSlot = periods[0]?.slots[0];

    if (firstSlot) {
      const [hour, minute] = firstSlot.split(':').map(Number);
      return date.hour(hour).minute(minute);
    }
  }

  return null;
};

export const formSchema = object({
  phone: string().required("Телефон обов'язковий").min(13, 'Невірний формат'),
  name: string().required("Ім'я обов'язкове"),
  email: string().email('Невірний формат пошти').required(`Пошта обов'язкова`),
  petName: string().optional(),
  comment: string().optional(),
});

export const getGroomerPrice = (
  groomer: Groomer,
  services: { vipPrice: number; defaultPrice: number }[]
): number | null => {
  if (services.length === 0) return null;
  return groomer.isVip ? services[0].vipPrice : services[0].defaultPrice;
};
