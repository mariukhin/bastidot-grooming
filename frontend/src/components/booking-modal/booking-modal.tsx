'use client';

import { useEffect, useMemo, useState } from 'react';
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/uk';
import classNames from 'classnames';
import { Resolver, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';

import { Modal } from '@/components/modal';
import { Icon, IconTypes } from '@/components/icon';
import { BreedProps, normalizeBreedList, ServiceProps } from '@/utils/function';
import { getBreedList } from '@/api/breed';
import { getServiceList } from '@/api/service';

import { BookingStep, BookingFormData, Groomer } from './types';
import { capitalize, generateWeekDates, generateTimeSlots, formSchema } from './utils';
import StepServices from './step-services';
import StepGroomer from './step-groomer';
import StepDatetime from './step-datetime';
import StepExtraServices from './step-extra-services';
import StepForm from './step-form';
import StepSuccess from './step-success';

import styles from './booking-modal.module.scss';
import useGroomerStore from '@/store/useGroomerStore';
import useOrderStore from '@/store/useOrderStore';

dayjs.locale('uk');

type BookingModalProps = {
  isOpen: boolean;
  onClose: () => void;
  initialBreed?: string;
  initialService?: ServiceProps;
};

const BookingModal = ({ isOpen, onClose, initialBreed, initialService }: BookingModalProps) => {
  const { groomerList } = useGroomerStore();
  const { createOrder } = useOrderStore();
  const [step, setStep] = useState<BookingStep>('services');

  const [breedList, setBreedList] = useState<BreedProps[]>([]);
  const [serviceList, setServiceList] = useState<ServiceProps[]>([]);
  const [selectedBreed, setSelectedBreed] = useState<BreedProps | null>(null);
  const [selectedServices, setSelectedServices] = useState<ServiceProps[]>(
    initialService ? [initialService] : []
  );
  const [selectedGroomer, setSelectedGroomer] = useState<Groomer | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState<Dayjs>(() => dayjs());
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [extraServiceList, setExtraServiceList] = useState<ServiceProps[]>([]);
  const [selectedExtraServices, setSelectedExtraServices] = useState<ServiceProps[]>([]);
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isValid },
  } = useForm<BookingFormData>({
    resolver: yupResolver(formSchema) as Resolver<BookingFormData>,
    mode: 'onChange',
    defaultValues: { phone: '', name: '', email: '', petName: '', comment: '' },
  });

  const now = useMemo(() => dayjs(), [step]);

  const weekDates = useMemo(
    () =>
      generateWeekDates(
        dayjs()
          .startOf('day')
          .add(weekOffset * 7, 'day')
      ),
    [weekOffset]
  );

  const timeSlots = useMemo(() => generateTimeSlots(selectedDate, now), [selectedDate, now]);

  const formattedDateTime = selectedSlot
    ? `${capitalize(selectedDate.format('dddd D MMMM'))}, ${selectedSlot}`
    : null;

  const totalDurationMin = useMemo(() => {
    const base =
      (selectedServices[0]?.durationHour ?? 0) * 60 + (selectedServices[0]?.durationMin ?? 0);
    const extra = selectedExtraServices.reduce(
      (sum, s) => sum + (s.durationHour ?? 0) * 60 + (s.durationMin ?? 0),
      0
    );
    return base + extra;
  }, [selectedServices, selectedExtraServices]);

  const formattedDateTimeRange = useMemo(() => {
    if (!selectedSlot) return null;
    const [h, m] = selectedSlot.split(':').map(Number);
    const start = selectedDate.hour(h).minute(m);
    const end = start.add(totalDurationMin, 'minute');
    return `${capitalize(selectedDate.format('dddd D MMMM'))}, ${start.format('HH:mm')}–${end.format('HH:mm')}`;
  }, [selectedSlot, selectedDate, totalDurationMin]);

  useEffect(() => {
    if (!isOpen) return;

    setStep('services');
    setSelectedServices(initialService ? [initialService] : []);
    setSelectedGroomer(null);
    setWeekOffset(0);
    const _today = dayjs().startOf('day');
    const _todayHasSlots = generateTimeSlots(_today, dayjs()).some((p) => p.slots.length > 0);
    setSelectedDate(_todayHasSlots ? _today : _today.add(1, 'day'));
    setSelectedSlot(null);
    setSelectedExtraServices([]);
    setIsSummaryExpanded(false);
    reset();

    (async () => {
      const result = await getBreedList();
      const normalized = normalizeBreedList(result);
      setBreedList(normalized);

      const targetBreedName = initialBreed ?? 'Мальтіпу';
      const defaultBreed = normalized.find((b) => b.value === targetBreedName) ?? normalized[0];

      if (defaultBreed) {
        setSelectedBreed(defaultBreed);
        const services = await getServiceList(defaultBreed.id);
        setServiceList(services);
      }

      const extraServices = normalized.find((b) => b.value === 'Додаткові послуги');

      if (extraServices) {
        const services = await getServiceList(extraServices.id);
        setExtraServiceList(services);
      }
    })();
  }, [isOpen]);

  const handleBreedChange = async (value: string) => {
    const breed = breedList.find((b) => b.value === value) ?? null;
    setSelectedBreed(breed);
    setSelectedServices([]);
    if (breed) {
      const services = await getServiceList(breed.id);
      setServiceList(services);
    }
  };

  const toggleService = (service: ServiceProps) =>
    setSelectedServices((prev) =>
      prev.some((s) => s.id === service.id)
        ? prev.filter((s) => s.id !== service.id)
        : [...prev, service]
    );

  const toggleExtraService = (service: ServiceProps) =>
    setSelectedExtraServices((prev) =>
      prev.some((s) => s.id === service.id)
        ? prev.filter((s) => s.id !== service.id)
        : [...prev, service]
    );

  const onSubmit = async (data: BookingFormData) => {
    if (!selectedGroomer || !selectedSlot) return;

    const [hour, minute] = selectedSlot.split(':').map(Number);
    const scheduledAt = selectedDate.hour(hour).minute(minute).second(0).toISOString();

    const order = await createOrder({
      clientName: data.name,
      clientPhone: data.phone,
      clientEmail: data.email,
      petName: data.petName?.trim() || 'Улюбленець',
      petAge: 0,
      petWeight: 0,
      petPhotoUrl: '',
      petComment: '',
      groomerId: selectedGroomer.id,
      scheduledAt,
      comment: data.comment ?? '',
      serviceIds: [...selectedServices, ...selectedExtraServices].map((s) => s.id),
    });

    if (order) {
      setStep('success');
    }
  };

  const handleBookAgain = () => {
    setStep('services');
    setSelectedServices([]);
    setSelectedGroomer(null);
    setWeekOffset(0);
    const _today = dayjs().startOf('day');
    const _todayHasSlots = generateTimeSlots(_today, dayjs()).some((p) => p.slots.length > 0);
    setSelectedDate(_todayHasSlots ? _today : _today.add(1, 'day'));
    setSelectedSlot(null);
    setSelectedExtraServices([]);
    setIsSummaryExpanded(false);
    reset();
  };

  const stepOnBack: Record<BookingStep, (() => void) | null> = {
    services: null,
    groomer: () => setStep('services'),
    datetime: () => setStep('groomer'),
    'extra-services': () => setStep('datetime'),
    form: () => setStep('extra-services'),
    success: null,
  };

  const backHandler = stepOnBack[step];
  const backButton = backHandler ? (
    <button
      type="button"
      style={{
        background: 'none',
        border: 'none',
        padding: 0,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        color: 'var(--color-woodsmoke)',
      }}
      onClick={backHandler}
      aria-label="Назад"
    >
      <Icon id={IconTypes.chevronLeft} width={20} height={20} />
    </button>
  ) : undefined;

  const sharedSummaryProps = {
    selectedServices,
    selectedBreed,
    selectedGroomer,
    formattedDateTime,
    isSummaryExpanded,
    onToggleSummary: () => setIsSummaryExpanded((prev) => !prev),
    selectedExtraServices,
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      modalClassName={classNames(styles.bookingModal, {
        [styles.bookingModalAuto]: step === 'success',
      })}
      disableScrollbar
      fitContent={step === 'success'}
      backButton={backButton}
    >
      {step === 'services' && (
        <StepServices
          breedList={breedList}
          serviceList={serviceList}
          selectedBreed={selectedBreed}
          selectedServices={selectedServices}
          onBreedChange={handleBreedChange}
          onToggleService={toggleService}
          onNext={() => setStep('groomer')}
        />
      )}

      {step === 'groomer' && (
        <StepGroomer
          groomers={groomerList}
          selectedGroomer={selectedGroomer}
          selectedServices={selectedServices}
          onSelectGroomer={setSelectedGroomer}
          onNext={() => setStep('datetime')}
        />
      )}

      {step === 'datetime' && (
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
          onNext={() => setStep('extra-services')}
          {...sharedSummaryProps}
        />
      )}

      {step === 'extra-services' && (
        <StepExtraServices
          extraServiceList={extraServiceList}
          onToggleExtraService={toggleExtraService}
          onNext={() => setStep('form')}
          {...sharedSummaryProps}
        />
      )}

      {step === 'form' && (
        <StepForm
          control={control}
          errors={errors}
          isValid={isValid}
          handleSubmit={handleSubmit}
          onSubmit={onSubmit}
          selectedServices={selectedServices}
          selectedExtraServices={selectedExtraServices}
          selectedGroomer={selectedGroomer}
          formattedDateTime={formattedDateTime}
          onGoToStep={setStep}
        />
      )}

      {step === 'success' && (
        <StepSuccess
          selectedServices={selectedServices}
          selectedExtraServices={selectedExtraServices}
          selectedGroomer={selectedGroomer}
          formattedDateTimeRange={formattedDateTimeRange}
          onBookAgain={handleBookAgain}
          onClose={onClose}
        />
      )}
    </Modal>
  );
};

export default BookingModal;
