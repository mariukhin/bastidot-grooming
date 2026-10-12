import { useState } from 'react';
import classNames from 'classnames';
import { Control, FieldErrors, UseFormHandleSubmit } from 'react-hook-form';
import { Controller } from 'react-hook-form';

import { Button } from '@/components/button';
import { Icon, IconTypes } from '@/components/icon';
import { TextInput } from '@/components/text-input';
import { Select } from '@/components/select';
import { applyMask, extractDigits } from '@/components/phone-input/utils';
import { PhoneInput } from '@/components/phone-input';
import { TextArea } from '@/components/text-area';
import { ServiceProps } from '@/utils/function';
import { PRIVACY_PATH } from '@/utils/privacy';
import { BookingFormData, Groomer } from './types';
import { formatDuration, getBookingTotals } from './utils';

import styles from './booking-modal.module.scss';

const OTHER_PET = '__other__';

type StepFormProps = {
  control: Control<BookingFormData>;
  errors: FieldErrors<BookingFormData>;
  isValid: boolean;
  handleSubmit: UseFormHandleSubmit<BookingFormData>;
  onSubmit: (data: BookingFormData) => void;
  selectedServices: ServiceProps[];
  selectedExtraServices: ServiceProps[];
  selectedGroomer: Groomer | null;
  formattedDateTime: string | null;
  errorMessage?: string | null;
  onGoToStep: (step: 'services' | 'groomer' | 'datetime') => void;
  lockedFields?: { phone?: boolean; name?: boolean; email?: boolean };
  pets?: { id: string; name: string }[];
  profile?: { name: string; phone: string } | null;
};

const StepForm = ({
  control,
  errors,
  isValid,
  handleSubmit,
  onSubmit,
  selectedServices,
  selectedExtraServices,
  selectedGroomer,
  formattedDateTime,
  errorMessage,
  onGoToStep,
  lockedFields,
  pets = [],
  profile,
}: StepFormProps) => {
  const [isDetailsOpen, setIsDetailsOpen] = useState(!profile);
  const [isOtherPet, setIsOtherPet] = useState(false);
  const { price, extraTotal, durationMinutes } = getBookingTotals(
    selectedServices,
    selectedExtraServices,
    selectedGroomer
  );

  const hasLocked = Boolean(lockedFields?.phone || lockedFields?.name || lockedFields?.email);

  const serviceNames = [selectedServices[0]?.type, ...selectedExtraServices.map((s) => s.type)]
    .filter(Boolean)
    .join(', ');

  return (
    <div className={styles.stepContainer}>
      <h2 className={styles.title}>Заповніть інформацію</h2>

      <form
        id="booking-form"
        className={classNames(styles.section, styles.sectionGrow, styles.formSection)}
        onSubmit={handleSubmit(onSubmit)}
      >
        {profile && !isDetailsOpen && (
          <div className={styles.contactsSummary}>
            <p className={styles.contactsSummaryText}>
              Записуємо на імʼя <strong>{profile.name}</strong>,{' '}
              {applyMask(extractDigits(profile.phone))}
            </p>
            <button
              type="button"
              className={styles.contactsSummaryButton}
              onClick={() => setIsDetailsOpen(true)}
            >
              Змінити
            </button>
          </div>
        )}

        <div className={styles.contactsFields} hidden={!isDetailsOpen}>
          <Controller
            control={control}
            name="phone"
            render={({ field }) => (
              <PhoneInput
                label="Телефон"
                required
                // Маска тримає цифри у власному стані й на маунті повідомляє
                // форму — без defaultValue підставлений номер вона б затерла.
                defaultValue={field.value}
                readOnly={lockedFields?.phone}
                onChange={field.onChange}
                onBlur={field.onBlur}
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
                defaultValue={field.value}
                readOnly={lockedFields?.name}
                onChange={field.onChange}
                onBlur={field.onBlur}
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
                placeholder="Наприклад: anna@gmail.com"
                type="email"
                defaultValue={field.value}
                readOnly={lockedFields?.email}
                onChange={field.onChange}
                onBlur={field.onBlur}
                error={errors.email?.message}
              />
            )}
          />
          {hasLocked && (
            <p className={styles.profileHint}>
              Контакти підставлені з вашого профілю. Змінити їх можна в кабінеті.
            </p>
          )}
        </div>

        <Controller
          control={control}
          name="petName"
          render={({ field }) => {
            const isKnown = pets.some((pet) => pet.name === field.value);
            const showInput = pets.length === 0 || isOtherPet || (!isKnown && field.value !== '');

            return (
              <>
                {pets.length > 0 && (
                  <Select
                    label="Улюбленець"
                    required
                    options={[
                      ...pets.map((pet) => ({ label: pet.name, value: pet.name })),
                      { label: 'Інший улюбленець', value: OTHER_PET },
                    ]}
                    defaultValue={isKnown ? field.value : showInput ? OTHER_PET : ''}
                    onChange={(value) => {
                      setIsOtherPet(value === OTHER_PET);
                      field.onChange(value === OTHER_PET ? '' : value);
                    }}
                  />
                )}

                {showInput && (
                  <TextInput
                    label="Ім'я улюбленця"
                    required
                    placeholder="Наприклад, Рекс"
                    // Без defaultValue поле не показує значення форми, і кличка,
                    // передзаповнена з картки улюбленця, лишалась невидимою.
                    defaultValue={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    error={errors.petName?.message}
                  />
                )}
              </>
            );
          }}
        />
        <Controller
          control={control}
          name="comment"
          render={({ field }) => (
            <TextArea label="Коментар" placeholder="Ваш коментар" onChange={field.onChange} />
          )}
        />

        <Controller
          control={control}
          name="consent"
          render={({ field }) => (
            <div>
              <label className={styles.consentRow}>
                <input
                  type="checkbox"
                  className={styles.consentInput}
                  checked={field.value === true}
                  onChange={(event) => field.onChange(event.target.checked)}
                  onBlur={field.onBlur}
                  aria-invalid={Boolean(errors.consent)}
                />
                <span
                  className={classNames(styles.checkbox, {
                    [styles.checkboxChecked]: field.value === true,
                  })}
                  aria-hidden="true"
                >
                  {field.value === true && (
                    <Icon id={IconTypes.check} width={12} height={12} color="#fff" />
                  )}
                </span>
                <span className={styles.consentText}>
                  Погоджуюсь на обробку персональних даних відповідно до{' '}
                  <a
                    className={styles.consentLink}
                    href={PRIVACY_PATH}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    політики конфіденційності
                  </a>
                </span>
              </label>
              {errors.consent && (
                <span className={styles.consentError} role="alert">
                  {errors.consent.message}
                </span>
              )}
            </div>
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
                  <p className={styles.serviceItemMeta}>{formatDuration(durationMinutes)}</p>
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

            {selectedGroomer && (
              <div className={styles.bookingSummaryRow}>
                <p className={styles.bookingSummaryText}>
                  Грумер {selectedGroomer.isVip ? 'VIP' : ''}: {selectedGroomer.name}
                </p>
                <button
                  type="button"
                  className={styles.editButton}
                  onClick={() => onGoToStep('groomer')}
                >
                  <Icon
                    id={IconTypes.edit}
                    width={16}
                    height={16}
                    color="var(--color-milano-red)"
                  />
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
                  <Icon
                    id={IconTypes.edit}
                    width={16}
                    height={16}
                    color="var(--color-milano-red)"
                  />
                </button>
              </div>
            )}
          </div>
        </div>
      </form>

      <div className={styles.footer}>
        {price !== null && (
          <div className={styles.summaryTotalRow}>
            <p className={styles.summaryTotalLabel}>Разом</p>
            {durationMinutes > 0 && (
              <p className={styles.summaryTotalMeta}>{formatDuration(durationMinutes)}</p>
            )}
            <p className={styles.summaryTotalValue}>
              {price} грн
              {extraTotal > 0 && <span className={styles.extraPriceHint}> (+{extraTotal})</span>}
            </p>
          </div>
        )}
        {errorMessage && (
          <p className={styles.submitError} role="alert">
            {errorMessage}
          </p>
        )}
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
