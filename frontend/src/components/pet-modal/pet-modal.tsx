'use client';

import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { mixed, object, string, type ObjectSchema } from 'yup';

import { Modal } from '@/components/modal';
import { Button } from '@/components/button';
import { TextInput } from '@/components/text-input';
import { TextArea } from '@/components/text-area';
import { BreedCombobox, type BreedChoice } from '@/components/breed-combobox';
import {
  createPet,
  fetchPetTraits,
  updatePet,
  type AccountPet,
  type PetTrait,
  type PetTraitValue,
} from '@/api/account';
import useToastStore from '@/store/useToastStore';
import { formatAgeLong, parseDecimal } from '@/utils/pet-age';

import { PetAvatar } from './pet-avatar';
import { TraitSliders } from './trait-sliders';
import styles from './pet-modal.module.scss';

const WISHES_MAX = 1000;

type PetFormData = {
  name: string;
  breed: BreedChoice;
  weight: string;
  birthDate: string;
  wishes: string;
};

const schema: ObjectSchema<PetFormData> = object({
  name: string().trim().required('Кличка обовʼязкова').max(40, 'До 40 символів'),
  breed: mixed<NonNullable<BreedChoice>>()
    .nullable()
    .defined()
    .test('breed-required', 'Оберіть породу або впишіть свою', (value) => Boolean(value)),
  weight: string()
    .required('Вага обовʼязкова')
    .test('weight-range', 'Вага від 0.1 до 100 кг', (value) => {
      const n = parseDecimal(value ?? '');
      return Number.isFinite(n) && n >= 0.1 && n <= 100;
    })
    .test('weight-step', 'Вага з точністю до 0.1 кг', (value) => {
      const n = parseDecimal(value ?? '');
      return Math.abs(n * 10 - Math.round(n * 10)) < 1e-9;
    }),
  birthDate: string()
    .default('')
    .test('not-future', 'Дата не може бути в майбутньому', (value) => {
      if (!value) return true;
      const date = new Date(value);
      return !Number.isNaN(date.getTime()) && date <= new Date();
    }),
  wishes: string().default('').max(WISHES_MAX, `До ${WISHES_MAX} символів`),
});

const toBreedChoice = (pet: AccountPet): BreedChoice => {
  if (pet.breedId && pet.breedName) return { kind: 'breed', id: pet.breedId, name: pet.breedName };
  if (pet.breedCustom) return { kind: 'custom', name: pet.breedCustom };
  return null;
};

/** yyyy-mm-dd для <input type="date">. */
const toDateInput = (iso: string | null): string => (iso ? iso.slice(0, 10) : '');

type PetModalProps = {
  pet: AccountPet | null;
  onClose: () => void;
  onSaved: () => void;
};

const PetModal = ({ pet, onClose, onSaved }: PetModalProps) => {
  const showToast = useToastStore((state) => state.showToast);
  const [traits, setTraits] = useState<PetTrait[]>([]);
  const [traitValues, setTraitValues] = useState<PetTraitValue[]>(pet?.traits ?? []);
  const [traitsDirty, setTraitsDirty] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    watch,
    setError,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<PetFormData>({
    resolver: yupResolver(schema),
    mode: 'onTouched',
    defaultValues: {
      name: pet?.name ?? '',
      breed: pet ? toBreedChoice(pet) : null,
      weight: pet ? String(pet.weight) : '',
      birthDate: toDateInput(pet?.birthDate ?? null),
      wishes: pet?.wishes ?? '',
    },
  });

  useEffect(() => {
    void fetchPetTraits().then((result) => {
      if (result) setTraits(result);
    });
  }, []);

  const birthDate = watch('birthDate');
  const wishes = watch('wishes');
  const ageLabel = birthDate ? formatAgeLong(new Date(birthDate)) : null;

  const onSubmit = async (values: PetFormData) => {
    setFormError(null);

    const body = {
      name: values.name.trim(),
      breedId: values.breed?.kind === 'breed' ? values.breed.id : null,
      breedCustom: values.breed?.kind === 'custom' ? values.breed.name : null,
      weight: parseDecimal(values.weight),
      birthDate: values.birthDate || null,
      wishes: values.wishes.trim(),
      traits: traitValues,
    };

    const result = pet ? await updatePet(pet.id, body) : await createPet(body);

    if (!result.ok) {
      if (result.field === 'breedId' || result.field === 'breedCustom') {
        setError('breed', { type: 'server', message: result.message });
      } else if (result.field === 'name' || result.field === 'weight') {
        setError(result.field, { type: 'server', message: result.message });
      } else if (result.field === 'birthDate') {
        setError('birthDate', { type: 'server', message: result.message });
      } else {
        setFormError(result.message);
      }
      return;
    }

    showToast(pet ? 'Зміни збережено' : 'Улюбленця додано');
    onSaved();
  };

  return (
    <Modal isOpen onClose={onClose} label={pet ? 'Редагувати улюбленця' : 'Новий улюбленець'}>
      <form className={styles.form} onSubmit={handleSubmit(onSubmit)} noValidate>
        <h2 className={styles.title}>{pet ? 'Редагувати улюбленця' : 'Новий улюбленець'}</h2>

        <PetAvatar photoUrl={pet?.photoUrl ?? null} species={pet?.species ?? 'dog'} />

        <Controller
          control={control}
          name="name"
          render={({ field }) => (
            <TextInput
              label="Кличка"
              required
              defaultValue={field.value}
              onChange={field.onChange}
              error={errors.name?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="breed"
          render={({ field }) => (
            <BreedCombobox
              required
              value={field.value}
              onChange={field.onChange}
              error={errors.breed?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="weight"
          render={({ field }) => (
            <TextInput
              label="Вага, кг"
              required
              inputMode="decimal"
              placeholder="Наприклад: 4,5"
              defaultValue={field.value}
              onChange={field.onChange}
              error={errors.weight?.message}
            />
          )}
        />

        <div>
          <Controller
            control={control}
            name="birthDate"
            render={({ field }) => (
              <TextInput
                label="Дата народження"
                type="date"
                max={new Date().toISOString().slice(0, 10)}
                defaultValue={field.value}
                onChange={field.onChange}
                error={errors.birthDate?.message}
              />
            )}
          />
          {ageLabel && <p className={styles.hint}>{ageLabel}</p>}
        </div>

        <div>
          <Controller
            control={control}
            name="wishes"
            render={({ field }) => (
              <TextArea
                label="Побажання"
                placeholder="Що варто знати грумеру"
                defaultValue={field.value}
                onChange={field.onChange}
                error={errors.wishes?.message}
              />
            )}
          />
          <p className={styles.counter}>
            {(wishes ?? '').length} / {WISHES_MAX}
          </p>
        </div>

        <TraitSliders
          traits={traits}
          values={traitValues}
          onChange={(next) => {
            setTraitValues(next);
            setTraitsDirty(true);
          }}
        />

        {formError && (
          <p className={styles.formError} role="alert">
            {formError}
          </p>
        )}

        <div className={styles.actions}>
          <Button
            type="submit"
            text={isSubmitting ? 'Зберігаємо…' : 'Зберегти'}
            size="medium"
            disabled={(!isDirty && !traitsDirty) || isSubmitting}
          />
          <Button
            type="button"
            text="Скасувати"
            variant="secondary"
            size="medium"
            onClick={onClose}
          />
        </div>
      </form>
    </Modal>
  );
};

export default PetModal;
