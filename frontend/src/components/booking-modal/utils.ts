import { Dayjs } from 'dayjs';
import { object, string } from 'yup';
import groomerPreview from '@/components/team-block/groomerPreview.png';
import { Groomer, TimeSlotPeriod } from './types';

export const GROOMERS: Groomer[] = [
  { id: 1, name: 'Ольга', isVip: false, photoSrc: groomerPreview, nextTime: '12 травня 12:00' },
  { id: 2, name: 'Юлія', isVip: false, photoSrc: groomerPreview, nextTime: '12 травня 12:00' },
];

export const generateWeekDates = (startOfWeek: Dayjs): Dayjs[] =>
  Array.from({ length: 7 }, (_, i) => startOfWeek.add(i, 'day'));

export const generateTimeSlots = (date: Dayjs, now: Dayjs): TimeSlotPeriod[] => {
  const isToday = date.isSame(now, 'day');

  const buildRange = (startHour: number, endHour: number) => {
    const slots: string[] = [];
    let cursor = date.hour(startHour).minute(0);
    const end = date.hour(endHour).minute(0);
    while (cursor.isBefore(end)) {
      if (!isToday || cursor.isAfter(now)) {
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
