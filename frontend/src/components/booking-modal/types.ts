import { StaticImageData } from 'next/image';
import { Dayjs } from 'dayjs';
import { BreedProps, ServiceProps } from '@/utils/function';

export type BookingStep = 'services' | 'groomer' | 'datetime' | 'extra-services' | 'form' | 'success';

export type TimeSlotPeriod = {
  period: string;
  slots: string[];
};

export type Groomer = {
  id: number;
  name: string;
  isVip: boolean;
  photoSrc: StaticImageData;
  nextTime: string;
};

export type BookingFormData = {
  phone: string;
  name: string;
  email: string;
  petName?: string;
  comment?: string;
};

export type BookingState = {
  breedList: BreedProps[];
  serviceList: ServiceProps[];
  selectedBreed: BreedProps | null;
  selectedServices: ServiceProps[];
  selectedGroomer: Groomer | null;
  weekOffset: number;
  selectedDate: Dayjs;
  selectedSlot: string | null;
  selectedExtraServices: ServiceProps[];
  isSummaryExpanded: boolean;
  formattedDateTime: string | null;
};
