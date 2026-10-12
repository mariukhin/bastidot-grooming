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
import { cancelOrder, getBusySlots, rescheduleOrder } from '@/api/order';
import { track } from '@/utils/analytics';

import { BookingStep, BookingFormData, BusySlot, Groomer } from './types';
import {
  capitalize,
  generateWeekDates,
  generateTimeSlots,
  getBookingTotals,
  formSchema,
} from './utils';
import StepServices from './step-services';
import StepGroomer from './step-groomer';
import StepDatetime from './step-datetime';
import StepExtraServices from './step-extra-services';
import StepForm from './step-form';
import StepSuccess from './step-success';
import StepCancelled from './step-cancelled';

import styles from './booking-modal.module.scss';
import useGroomerStore from '@/store/useGroomerStore';
import type { BookingIntent } from '@/store/useBookingStore';
import useOrderStore from '@/store/useOrderStore';
import useUserStore from '@/store/useUserStore';
import { fetchAccountPets } from '@/api/account';

dayjs.locale('uk');

type BookingModalProps = {
  isOpen: boolean;
  onClose: () => void;
  intent?: BookingIntent;
};

const STEP_LABEL: Record<BookingStep, string> = {
  services: 'Запис: оберіть послугу',
  groomer: 'Запис: оберіть майстра',
  'extra-services': 'Запис: додаткові послуги',
  datetime: 'Запис: оберіть дату та час',
  form: 'Запис: ваші дані',
  success: 'Запис підтверджено',
  cancelled: 'Запис скасовано',
};

const BookingModal = ({ isOpen, onClose, intent }: BookingModalProps) => {
  const initialBreed = intent?.breedName;
  const initialPetName = intent?.pet?.name;
  const initialService = intent?.service;
  const initialGroomer = intent?.groomer;
  const { groomerList, fetchGroomers } = useGroomerStore();
  const { createOrder } = useOrderStore();
  const user = useUserStore((state) => state.user);
  const [step, setStep] = useState<BookingStep>('services');

  const [breedList, setBreedList] = useState<BreedProps[]>([]);
  const [serviceList, setServiceList] = useState<ServiceProps[]>([]);
  const [selectedBreed, setSelectedBreed] = useState<BreedProps | null>(null);
  const [selectedServices, setSelectedServices] = useState<ServiceProps[]>(
    initialService ? [initialService] : []
  );
  const [selectedGroomer, setSelectedGroomer] = useState<Groomer | null>(initialGroomer ?? null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState<Dayjs>(() => dayjs());
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<{
    orderId: string | null;
    token: string | null;
    startAt: Date;
    petName: string;
  } | null>(null);
  // Увімкнено, коли з екрана успіху пішли міняти час: крок дати тоді веде не
  // до форми (дані клієнта вже є), а одразу до PATCH наявного запису.
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isActionPending, setIsActionPending] = useState(false);
  const [extraServiceList, setExtraServiceList] = useState<ServiceProps[]>([]);
  const [selectedExtraServices, setSelectedExtraServices] = useState<ServiceProps[]>([]);
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(true);
  const [busySlots, setBusySlots] = useState<BusySlot[]>([]);
  const [repeatNotice, setRepeatNotice] = useState<string | null>(null);
  const [accountPets, setAccountPets] = useState<{ id: string; name: string }[]>([]);

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isValid },
  } = useForm<BookingFormData>({
    resolver: yupResolver(formSchema) as Resolver<BookingFormData>,
    // onTouched, а не onChange: PhoneInput повідомляє '+380' одразу на маунті,
    // і при onChange поле спалахувало помилкою ще до того, як користувач
    // щось увів. Тепер перевірка — після першого blur.
    mode: 'onTouched',
    defaultValues: { phone: '', name: '', email: '', petName: initialPetName ?? '', comment: '' },
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

  const totalDurationMin = useMemo(() => {
    const base =
      (selectedServices[0]?.durationHour ?? 0) * 60 + (selectedServices[0]?.durationMin ?? 0);
    const extra = selectedExtraServices.reduce(
      (sum, s) => sum + (s.durationHour ?? 0) * 60 + (s.durationMin ?? 0),
      0
    );
    return base + extra;
  }, [selectedServices, selectedExtraServices]);

  const timeSlots = useMemo(
    () => generateTimeSlots(selectedDate, now, totalDurationMin, busySlots),
    [selectedDate, now, totalDurationMin, busySlots]
  );

  const formattedDateTime = selectedSlot
    ? `${capitalize(selectedDate.format('dddd D MMMM'))}, ${selectedSlot}`
    : null;

  const formattedDateTimeRange = useMemo(() => {
    if (!selectedSlot) return null;
    const [h, m] = selectedSlot.split(':').map(Number);
    const start = selectedDate.hour(h).minute(m);
    const end = start.add(totalDurationMin, 'minute');
    return `${capitalize(selectedDate.format('dddd D MMMM'))}, ${start.format('HH:mm')}–${end.format('HH:mm')}`;
  }, [selectedSlot, selectedDate, totalDurationMin]);

  useEffect(() => {
    if (!isOpen || !user) return;

    if (user.phoneNumber) setValue('phone', user.phoneNumber, { shouldValidate: true });
    if (user.name) setValue('name', user.name, { shouldValidate: true });
    if (user.email) setValue('email', user.email, { shouldValidate: true });
  }, [isOpen, user?.phoneNumber, user?.name, user?.email, setValue]);

  useEffect(() => {
    if (!isOpen || !user?.phoneVerified) return;

    let cancelled = false;
    void fetchAccountPets().then((result) => {
      if (!cancelled && result.ok) {
        setAccountPets(result.data.map((pet) => ({ id: pet.id, name: pet.name })));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [isOpen, user?.phoneVerified]);

  // Стор грумерів наповнює блок «Команда» на головній. На сторінках без нього
  // (кабінет) список лишався порожнім, і запис упирався в крок «Оберіть майстра».
  useEffect(() => {
    if (!isOpen || groomerList.length > 0) return;
    void fetchGroomers();
  }, [isOpen, groomerList.length, fetchGroomers]);

  useEffect(() => {
    if (!isOpen) return;

    setStep('services');
    setSelectedServices(initialService ? [initialService] : []);
    setSelectedGroomer(initialGroomer ?? null);
    setWeekOffset(0);
    const _today = dayjs().startOf('day');
    const _todayHasSlots = generateTimeSlots(_today, dayjs()).some((p) => p.slots.length > 0);
    setSelectedDate(_todayHasSlots ? _today : _today.add(1, 'day'));
    setSelectedSlot(null);
    setSelectedExtraServices([]);
    setIsSummaryExpanded(true);
    setRepeatNotice(null);
    setAccountPets([]);

    reset({
      phone: user?.phoneNumber ?? '',
      name: user?.name ?? '',
      email: user?.email ?? '',
      petName: initialPetName ?? '',
      comment: '',
    });

    (async () => {
      const result = await getBreedList();
      const normalized = normalizeBreedList(result);
      setBreedList(normalized);

      const targetBreedName = initialBreed ?? 'Мальтіпу';
      const defaultBreed =
        (intent?.breedId ? normalized.find((b) => b.id === intent.breedId) : undefined) ??
        normalized.find((b) => b.value === targetBreedName) ??
        normalized[0];

      let mainServices: ServiceProps[] = [];
      if (defaultBreed) {
        setSelectedBreed(defaultBreed);
        mainServices = await getServiceList(defaultBreed.id);
        setServiceList(mainServices);
      }

      let extraServices: ServiceProps[] = [];
      const extraBreed = normalized.find((b) => b.value === 'Додаткові послуги');

      if (extraBreed) {
        extraServices = await getServiceList(extraBreed.id);
        setExtraServiceList(extraServices);
      }

      if (!intent?.serviceIds?.length) return;

      await applyRepeat(intent.serviceIds, mainServices, extraServices);
    })();
  }, [isOpen]);

  const applyRepeat = async (
    serviceIds: string[],
    mainServices: ServiceProps[],
    extraServices: ServiceProps[]
  ) => {
    const main = serviceIds
      .map((id) => mainServices.find((s) => s.id === id))
      .filter((s): s is ServiceProps => Boolean(s));
    const extra = serviceIds
      .map((id) => extraServices.find((s) => s.id === id))
      .filter((s): s is ServiceProps => Boolean(s));

    setSelectedServices(main);
    setSelectedExtraServices(extra);

    let groomers = useGroomerStore.getState().groomerList;
    if (groomers.length === 0) {
      await fetchGroomers();
      groomers = useGroomerStore.getState().groomerList;
    }

    const groomer = intent?.groomerId
      ? (groomers.find((g) => g.id === intent.groomerId) ?? null)
      : null;
    if (groomer) setSelectedGroomer(groomer);

    if (main.length + extra.length < serviceIds.length || main.length === 0) {
      setRepeatNotice(
        'Частину послуг того візиту ми більше не надаємо. Перевірте, що лишилось, і додайте потрібне'
      );
      setStep('services');
      return;
    }

    if (!groomer) {
      setRepeatNotice('Майстра того візиту зараз немає в записі онлайн. Оберіть, до кого йдемо');
      setStep('groomer');
      return;
    }

    setStep(intent?.startStep ?? 'datetime');
  };

  useEffect(() => {
    if (!isOpen || !selectedGroomer || step !== 'datetime') {
      setBusySlots([]);
      return;
    }

    (async () => {
      const from = weekDates[0].format('YYYY-MM-DD');
      const to = weekDates[weekDates.length - 1].format('YYYY-MM-DD');
      const result = await getBusySlots(selectedGroomer.id, from, to);
      setBusySlots(Array.isArray(result) ? result : []);
    })();
  }, [isOpen, step, selectedGroomer, weekDates]);

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

    track('booking_submitted', {
      services_count: selectedServices.length + selectedExtraServices.length,
      duration_minutes: totalDurationMin,
    });

    const [hour, minute] = selectedSlot.split(':').map(Number);
    const startAt = selectedDate.hour(hour).minute(minute).second(0);
    const scheduledAt = startAt.toISOString();

    const order = await createOrder({
      clientName: data.name,
      clientPhone: data.phone,
      clientEmail: data.email?.trim() ?? '',
      petName: data.petName.trim(),
      petAge: 0,
      petWeight: 0,
      petPhotoUrl: '',
      petComment: '',
      petBreedId: selectedBreed?.id,
      groomerId: selectedGroomer.id,
      scheduledAt,
      durationMinutes: totalDurationMin,
      comment: data.comment ?? '',
      serviceIds: [...selectedServices, ...selectedExtraServices].map((s) => s.id),
    });

    if (order) {
      track('booking_success', {
        order_id: order.id,
        groomer: selectedGroomer.name,
        duration_minutes: totalDurationMin,
        value:
          getBookingTotals(selectedServices, selectedExtraServices, selectedGroomer).price ?? 0,
        currency: 'UAH',
      });
      setConfirmed({
        orderId: order.id ?? null,
        token: order.cancelToken ?? null,
        startAt: startAt.toDate(),
        petName: data.petName.trim(),
      });
      setStep('success');
    }
  };

  const handleCancelOrder = async () => {
    if (!confirmed?.orderId || !confirmed.token) return;

    setIsActionPending(true);
    setActionError(null);
    const result = await cancelOrder(confirmed.orderId, confirmed.token);
    setIsActionPending(false);

    if (result.ok) {
      track('booking_cancelled', { order_id: confirmed.orderId });
      setStep('cancelled');
    } else {
      setActionError(result.message);
    }
  };

  const handleStartReschedule = () => {
    setActionError(null);
    setIsRescheduling(true);
    setSelectedSlot(null);
    setStep('datetime');
    track('booking_reschedule_start', { order_id: confirmed?.orderId ?? undefined });
  };

  const handleConfirmReschedule = async () => {
    if (!confirmed?.orderId || !confirmed.token || !selectedSlot) return;

    const [hour, minute] = selectedSlot.split(':').map(Number);
    const startAt = selectedDate.hour(hour).minute(minute).second(0);

    setIsActionPending(true);
    setActionError(null);
    const result = await rescheduleOrder(
      confirmed.orderId,
      confirmed.token,
      startAt.toISOString(),
      totalDurationMin
    );
    setIsActionPending(false);

    if (result.ok) {
      track('booking_rescheduled', { order_id: confirmed.orderId });
      setConfirmed({ ...confirmed, startAt: startAt.toDate() });
      setIsRescheduling(false);
      setStep('success');
    } else {
      setActionError(result.message);
    }
  };

  const handleBookAgain = () => {
    setConfirmed(null);
    setIsRescheduling(false);
    setActionError(null);
    setStep('services');
    setSelectedServices([]);
    setSelectedGroomer(null);
    setWeekOffset(0);
    const _today = dayjs().startOf('day');
    const _todayHasSlots = generateTimeSlots(_today, dayjs()).some((p) => p.slots.length > 0);
    setSelectedDate(_todayHasSlots ? _today : _today.add(1, 'day'));
    setSelectedSlot(null);
    setSelectedExtraServices([]);
    setIsSummaryExpanded(true);
    reset();
  };

  const stepOnBack: Record<BookingStep, (() => void) | null> = {
    services: null,
    groomer: () => setStep('services'),
    'extra-services': () => setStep('groomer'),
    datetime: () => {
      if (!isRescheduling) {
        setStep('extra-services');
        return;
      }
      setIsRescheduling(false);
      setActionError(null);
      setStep('success');
    },
    form: () => setStep('datetime'),
    success: null,
    cancelled: null,
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
        [styles.bookingModalAuto]: step === 'success' || step === 'cancelled',
      })}
      disableScrollbar
      fitContent={step === 'success' || step === 'cancelled'}
      label={STEP_LABEL[step]}
      backButton={backButton}
    >
      {step === 'services' && (
        <StepServices
          breedList={breedList}
          serviceList={serviceList}
          selectedBreed={selectedBreed}
          selectedServices={selectedServices}
          notice={repeatNotice}
          onBreedChange={handleBreedChange}
          onToggleService={toggleService}
          onNext={() => {
            track('service_selected', {
              service: selectedServices[0]?.type,
              breed: selectedBreed?.value,
              price: selectedServices[0]?.defaultPrice,
            });
            setStep('groomer');
          }}
        />
      )}

      {step === 'groomer' && (
        <StepGroomer
          groomers={groomerList}
          selectedGroomer={selectedGroomer}
          selectedServices={selectedServices}
          selectedExtraServices={selectedExtraServices}
          isSummaryExpanded={isSummaryExpanded}
          onToggleSummary={() => setIsSummaryExpanded((prev) => !prev)}
          notice={repeatNotice}
          onSelectGroomer={setSelectedGroomer}
          onNext={() => {
            track('groomer_selected', {
              groomer: selectedGroomer?.name,
              is_vip: selectedGroomer?.isVip,
            });
            setStep('extra-services');
          }}
        />
      )}

      {step === 'extra-services' && (
        <StepExtraServices
          extraServiceList={extraServiceList}
          onToggleExtraService={toggleExtraService}
          onNext={() => {
            track('addons_step', {
              addons_count: selectedExtraServices.length,
              addons_total: selectedExtraServices.reduce((sum, s) => sum + s.defaultPrice, 0),
            });
            setStep('datetime');
          }}
          {...sharedSummaryProps}
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
          onNext={() => {
            if (isRescheduling) {
              void handleConfirmReschedule();
              return;
            }
            track('slot_selected', {
              slot: selectedSlot ?? undefined,
              days_ahead: selectedDate.startOf('day').diff(dayjs().startOf('day'), 'day'),
            });
            setStep('form');
          }}
          durationMinutes={totalDurationMin}
          nextLabel={isRescheduling ? 'Перенести запис' : 'Далі'}
          isNextPending={isActionPending}
          errorMessage={isRescheduling ? actionError : null}
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
          // Замикаємо лише те, що справді взяли з профілю: пошти там може не
          // бути, і тоді поле лишається вільним — саме тут її й вкажуть.
          lockedFields={{
            phone: Boolean(user?.phoneNumber),
            name: Boolean(user?.name),
            email: Boolean(user?.email),
          }}
          pets={accountPets}
          profile={
            user?.name && user?.phoneNumber ? { name: user.name, phone: user.phoneNumber } : null
          }
        />
      )}

      {step === 'success' && (
        <StepSuccess
          selectedServices={selectedServices}
          selectedExtraServices={selectedExtraServices}
          selectedGroomer={selectedGroomer}
          formattedDateTimeRange={formattedDateTimeRange}
          startAt={confirmed?.startAt ?? null}
          durationMinutes={totalDurationMin}
          petName={confirmed?.petName ?? ''}
          orderId={confirmed?.orderId ?? null}
          canManage={Boolean(confirmed?.orderId && confirmed.token)}
          isActionPending={isActionPending}
          actionError={actionError}
          onBookAgain={handleBookAgain}
          onCancelOrder={() => void handleCancelOrder()}
          onReschedule={handleStartReschedule}
        />
      )}

      {step === 'cancelled' && (
        <StepCancelled
          formattedDateTimeRange={formattedDateTimeRange}
          onBookAgain={handleBookAgain}
        />
      )}
    </Modal>
  );
};

export default BookingModal;
