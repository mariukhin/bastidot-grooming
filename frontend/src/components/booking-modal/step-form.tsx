import classNames from 'classnames';
import { Control, FieldErrors, UseFormHandleSubmit } from 'react-hook-form';
import { Controller } from 'react-hook-form';

import { Button } from '@/components/button';
import { Icon, IconTypes } from '@/components/icon';
import { TextInput } from '@/components/text-input';
import { PhoneInput } from '@/components/phone-input';
import { TextArea } from '@/components/text-area';
import { BreedProps, ServiceProps } from '@/utils/function';
import { BookingFormData, Groomer } from './types';
import { getGroomerPrice } from './utils';

import styles from './booking-modal.module.scss';

type StepFormProps = {
  control: Control<BookingFormData>;
  errors: FieldErrors<BookingFormData>;
  isValid: boolean;
  handleSubmit: UseFormHandleSubmit<BookingFormData>;
  onSubmit: (data: BookingFormData) => void;
  selectedServices: ServiceProps[];
  selectedExtraServices: ServiceProps[];
  selectedBreed: BreedProps | null;
  selectedGroomer: Groomer | null;
  formattedDateTime: string | null;
  onGoToStep: (step: 'services' | 'groomer' | 'datetime') => void;
};

const StepForm = ({
  control,
  errors,
  isValid,
  handleSubmit,
  onSubmit,
  selectedServices,
  selectedExtraServices,
  selectedBreed,
  selectedGroomer,
  formattedDateTime,
  onGoToStep,
}: StepFormProps) => {
  const extraTotal = selectedExtraServices.reduce((sum, s) => sum + s.defaultPrice, 0);
  const basePrice = selectedGroomer ? getGroomerPrice(selectedGroomer, selectedServices) : null;
  const totalPrice = basePrice !== null ? basePrice + extraTotal : null;

  const serviceNames = [
    selectedServices[0]?.type,
    ...selectedExtraServices.map((s) => s.type),
  ]
    .filter(Boolean)
    .join(', ');

  const totalMinutes =
    (selectedServices[0]?.durationHour ?? 0) * 60 +
    (selectedServices[0]?.durationMin ?? 0) +
    selectedExtraServices.reduce(
      (sum, s) => sum + (s.durationHour ?? 0) * 60 + (s.durationMin ?? 0),
      0
    );
  const durationHour = Math.floor(totalMinutes / 60);
  const durationMin = totalMinutes % 60;

  return (
  <div className={styles.stepContainer}>
    <h2 className={styles.title}>Заповніть інформацію</h2>

    <form
      id="booking-form"
      className={classNames(styles.section, styles.sectionGrow, styles.formSection)}
      onSubmit={handleSubmit(onSubmit)}
    >
      <Controller
        control={control}
        name="phone"
        render={({ field }) => (
          <PhoneInput
            label="Телефон"
            required
            onChange={field.onChange}
            error={errors.phone?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="name"
        render={({ field }) => (
          <TextInput
            label="Ваше ім'я"
            required
            placeholder="Наприклад: Анна"
            onChange={field.onChange}
            error={errors.name?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="email"
        render={({ field }) => (
          <TextInput
            label="Електронна пошта"
            required
            placeholder="Наприклад: anna@gmail.com"
            type="email"
            onChange={field.onChange}
            error={errors.email?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="petName"
        render={({ field }) => (
          <TextInput
            label="Ім'я улюбленця"
            placeholder="Наприклад, Рекс"
            onChange={field.onChange}
          />
        )}
      />
      <Controller
        control={control}
        name="comment"
        render={({ field }) => (
          <TextArea label="Коментар" placeholder="Ваш коментар" onChange={field.onChange} />
        )}
      />

      <div className={styles.bookingSummarySection}>
        <p className={styles.sectionLabel}>Запис</p>
        <div className={styles.bookingSummaryList}>
          <div className={styles.bookingSummaryRow}>
            <div className={styles.bookingSummaryInfo}>
              <p className={styles.bookingSummaryText}>{serviceNames}</p>
              <div className={styles.serviceItemRow}>
                <Icon id={IconTypes.clock} color="var(--color-gray)" width={14} height={14} />
                <p className={styles.serviceItemMeta}>
                  {durationHour ? `${durationHour} год` : ''}{' '}
                  {durationMin ? `${durationMin} хв` : ''}
                </p>
              </div>
            </div>
            <button
              type="button"
              className={styles.editButton}
              onClick={() => onGoToStep('services')}
            >
              <Icon id={IconTypes.edit} width={16} height={16} color="var(--color-milano-red)" />
            </button>
          </div>

          {selectedGroomer && totalPrice !== null && (
            <div className={styles.bookingSummaryRow}>
              <p className={styles.bookingSummaryText}>
                Грумер {selectedGroomer.isVip ? 'VIP' : ''}: {selectedGroomer.name} – {totalPrice} грн
              </p>
              <button
                type="button"
                className={styles.editButton}
                onClick={() => onGoToStep('groomer')}
              >
                <Icon id={IconTypes.edit} width={16} height={16} color="var(--color-milano-red)" />
              </button>
            </div>
          )}

          {formattedDateTime && (
            <div className={styles.bookingSummaryRow}>
              <p className={styles.bookingSummaryText}>{formattedDateTime}</p>
              <button
                type="button"
                className={styles.editButton}
                onClick={() => onGoToStep('datetime')}
              >
                <Icon id={IconTypes.edit} width={16} height={16} color="var(--color-milano-red)" />
              </button>
            </div>
          )}
        </div>
      </div>
    </form>

    <div className={styles.footer}>
      <Button
        text="Записатися зараз"
        size="large"
        type="submit"
        form="booking-form"
        disabled={!isValid}
      />
    </div>
  </div>
  );
};

export default StepForm;
