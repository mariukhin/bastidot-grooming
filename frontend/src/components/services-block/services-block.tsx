'use client';

import styles from './services-block.module.scss';
import { Select } from '@/components/select';
import { Controller, useForm } from 'react-hook-form';
import {
  FormExampleFormData,
  formExampleValidationSchema,
} from '@/components/form-example/validation';
import { yupResolver } from '@hookform/resolvers/yup';
import ServiceItem from '@/components/service-item/service-item';
import {Button} from "@/components/button";

const ServicesBlock = () => {
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

  const services = [
    {
      id: 1,
      serviceType: 'Повний комплекс',
      breedName: 'Мальтіпу',
      defaultPrice: 1000,
      vipPrice: 1500,
      durationHour: 3,
      durationMin: 30,
    },
    {
      id: 2,
      serviceType: 'Гігієнічний догляд',
      breedName: 'Мальтіпу',
      defaultPrice: 1000,
      vipPrice: 1500,
      durationHour: 3,
      durationMin: 30,
    },
    {
      id: 3,
      serviceType: 'Преміум комплекс',
      breedName: 'Мальтіпу',
      defaultPrice: 1000,
      vipPrice: 1500,
      durationHour: 3,
      durationMin: 30,
    },
    {
      id: 4,
      serviceType: 'Повний комплекс',
      breedName: 'Мальтіпу',
      defaultPrice: 1000,
      vipPrice: 1500,
      durationHour: 3,
      durationMin: 30,
    },
    {
      id: 5,
      serviceType: 'Гігієнічний догляд',
      breedName: 'Мальтіпу',
      defaultPrice: 1000,
      vipPrice: 1500,
      durationHour: 3,
      durationMin: 30,
    },
  ];

  return (
    <div className={styles.container} id={'services'}>
      <p className={styles.title}>Послуги</p>
      <div className={styles.selectBlock}>
        <p className={styles.selectBlockText}>Оберіть вашого улюбленця</p>
        <Controller
          control={control}
          name={'type'}
          render={({ field }) => (
            <Select
              className={styles.select}
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
      </div>
      <div className={styles.serviceContainer}>
        {services.map((item) => (
          <div className={styles.serviceItemContainer}>
            <ServiceItem key={item.id} item={item} />
            <Button type={'submit'} text={'Записатись'} color={'blue'} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default ServicesBlock;
