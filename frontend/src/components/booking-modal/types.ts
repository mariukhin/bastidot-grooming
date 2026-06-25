import { Dayjs } from 'dayjs';
import { BreedProps, ServiceProps } from '@/utils/function';
import { StaticImageData } from 'next/image';

export type BookingStep =
  | 'services'
  | 'groomer'
  | 'datetime'
  | 'extra-services'
  | 'form'
  | 'success';

export type TimeSlotPeriod = {
  period: string;
  slots: string[];
};

export type GroomerDbProps = {
  id: string;
  name: string;
  isVip: boolean;
  photoUrl: string;
};

export type Groomer = {
  id: string;
  name: string;
  isVip: boolean;
  photoSrc: string | StaticImageData;
  nearestDate: Dayjs;
};

export type BookingFormData = {
  phone: string;
  name: string;
  email: string;
  petName?: string;
  comment?: string;
};

export type OrderRequest = {
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  petName: string;
  petAge: number;
  petWeight: number;
  petPhotoUrl: string;
  petComment: string;
  groomerId: string;
  scheduledAt: string;
  comment: string;
  serviceIds: string[];
};

export type OrderResponse = {
  id: string;
  clientId: string;
  petId: string;
  groomerId: string;
  createdAt: string;
  scheduledAt: string;
  status: string;
  comment: string;
  serviceIds: string[];
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
