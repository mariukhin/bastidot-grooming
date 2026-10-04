'use client';

import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { object, string, type ObjectSchema } from 'yup';

import { Button } from '@/components/button';
import { TextInput } from '@/components/text-input';
import { PhoneInput } from '@/components/phone-input';
import { updateAccountProfile } from '@/api/account';
import useUserStore from '@/store/useUserStore';
import useToastStore from '@/store/useToastStore';

import styles from './account.module.scss';

type ProfileFormData = {
  name: string;
  email: string;
  phoneNumber: string;
};

const schema: ObjectSchema<ProfileFormData> = object({
  name: string().trim().required("Ім'я обов'язкове"),
  email: string().trim().email('Невірний формат пошти').required("Пошта обов'язкова"),
  // Поле вимкнене, тож лишаємо його у формі лише щоб показувати значення
  // й серверну помилку під ним.
  phoneNumber: string().default(''),
});

const ProfileTab = () => {
  const { user, mergeUser } = useUserStore();
  const showToast = useToastStore((state) => state.showToast);

  const {
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<ProfileFormData>({
    resolver: yupResolver(schema),
    mode: 'onTouched',
    defaultValues: {
      name: user?.name ?? '',
      email: user?.email ?? '',
      phoneNumber: user?.phoneNumber ?? '',
    },
  });

  useEffect(() => {
    if (!user) return;

    reset(
      { name: user.name, email: user.email, phoneNumber: user.phoneNumber ?? '' },
      { keepDirtyValues: true }
    );
  }, [user?.name, user?.email, user?.phoneNumber, reset]);

  if (!user) return null;

  const onSubmit = async (values: ProfileFormData) => {
    const result = await updateAccountProfile({ name: values.name, email: values.email });

    if (!result.ok) {
      setError(result.field ?? 'name', { type: 'server', message: result.message });
      return;
    }

    mergeUser({ name: result.profile.name, email: result.profile.email });
    reset({
      name: result.profile.name,
      email: result.profile.email,
      phoneNumber: result.profile.phoneNumber,
    });
    showToast('Зміни збережено');
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit(onSubmit)} noValidate>
      <Controller
        control={control}
        name="name"
        render={({ field }) => (
          <TextInput
            label="Ваше ім'я"
            required
            defaultValue={field.value}
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
            type="email"
            defaultValue={field.value}
            onChange={field.onChange}
            error={errors.email?.message}
          />
        )}
      />

      <div>
        <Controller
          control={control}
          name="phoneNumber"
          render={({ field }) => (
            <PhoneInput
              label="Телефон"
              disabled
              defaultValue={field.value}
              onChange={field.onChange}
              error={errors.phoneNumber?.message}
            />
          )}
        />
        <p className={styles.fieldHint}>
          Номер звʼязує акаунт із вашою карткою в салоні, тож змінюємо його лише після
          підтвердження. Зателефонуйте нам — поміняємо вручну.
        </p>
      </div>

      <Button
        className={styles.save}
        type="submit"
        text={isSubmitting ? 'Зберігаємо…' : 'Зберегти'}
        size="medium"
        disabled={!isDirty || isSubmitting}
      />
    </form>
  );
};

export default ProfileTab;
