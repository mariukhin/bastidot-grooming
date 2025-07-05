'use client';

import { yupResolver } from '@hookform/resolvers/yup';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';

import { TextInput } from '@/components/text-input';
import { TextArea } from '@/components/text-area';
import { PhoneInput } from '@/components/phone-input';
import { Select } from '@/components/select';
import { Button } from '@/components/button';
import { Modal } from '@/components/modal';

import type { FormExampleFormData } from './validation';
import { formExampleValidationSchema } from './validation';

const FormExample = () => {
  const [modal, setModal] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormExampleFormData>({
    resolver: yupResolver(formExampleValidationSchema),
    defaultValues: {
      name: '',
      description: undefined,
      phoneNumber: '',
      type: '',
    },
  });

  const onSubmit = (data: FormExampleFormData) => {
    console.log('data', data);
  };

  return (
    <>
      <form
        style={{
          width: 400,
          margin: '0px auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
        onSubmit={handleSubmit(onSubmit)}
      >
        <Controller
          control={control}
          name={'name'}
          render={({ field }) => (
            <TextInput
              label={'Name'}
              required
              defaultValue={field.value}
              onChange={field.onChange}
              error={errors?.name?.message}
            />
          )}
        />
        <Controller
          control={control}
          name={'description'}
          render={({ field }) => (
            <TextArea
              label={'Description'}
              defaultValue={field.value}
              onChange={field.onChange}
              error={errors?.description?.message}
            />
          )}
        />
        <Controller
          control={control}
          name={'phoneNumber'}
          render={({ field }) => (
            <PhoneInput
              label={'Description'}
              required
              defaultValue={field.value}
              onChange={field.onChange}
              error={errors?.phoneNumber?.message}
            />
          )}
        />
        <Controller
          control={control}
          name={'type'}
          render={({ field }) => (
            <Select
              label={'Type'}
              options={[
                { label: 'Type 1', value: '1' },
                {
                  label: 'Type 2',
                  value: '2',
                },
                {
                  label: 'Type 3',
                  value: '3',
                },
              ]}
              required
              defaultValue={field.value}
              onChange={field.onChange}
              error={errors?.type?.message}
            />
          )}
        />
        <Button type={'button'} text={'Open modal'} onClick={() => setModal(true)} />
        <Button type={'submit'} text={'Primary Red Large'} size={'large'} />
        <Button type={'submit'} text={'Secondary Red Medium'} variant={'secondary'} />
        <Button type={'submit'} text={'Secondary Red Large'} variant={'secondary'} size={'large'} />
        <Button type={'submit'} text={'Primary Blue Medium'} color={'blue'} />
        <Button type={'submit'} text={'Primary Blue Large'} size={'large'} color={'blue'} />
        <Button
          type={'submit'}
          text={'Secondary Blue Medium'}
          variant={'secondary'}
          color={'blue'}
        />
        <Button
          type={'submit'}
          text={'Secondary Blue Large'}
          variant={'secondary'}
          size={'large'}
          color={'blue'}
        />
      </form>
      <Modal isOpen={modal} onClose={() => setModal(false)}>
        <h2>Оберіть послугу</h2>
        <div style={{ height: 2000, backgroundColor: 'pink' }}>Content</div>
      </Modal>
    </>
  );
};

export default FormExample;
