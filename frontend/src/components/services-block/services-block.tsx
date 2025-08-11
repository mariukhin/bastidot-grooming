'use client';
import { useEffect, useState } from 'react';

import styles from './services-block.module.scss';
import { Select } from '@/components/select';
import { Controller, useForm } from 'react-hook-form';
import {
  FormExampleFormData,
  formExampleValidationSchema,
} from '@/components/form-example/validation';
import { yupResolver } from '@hookform/resolvers/yup';
import ServiceItem from '@/components/service-item/service-item';
import { Button } from '@/components/button';
import { BreedProps, normalizeBreedList, ServiceProps } from '@/utils/function';
import { getBreedList } from '@/api/breed';
import { getServiceList } from '@/api/service';

const ServicesBlock = () => {
  const [breedList, setBreedList] = useState<BreedProps[]>([]);
  const [serviceList, setServiceList] = useState<ServiceProps[]>([]);
  const {
    control,
    getValues,
    formState: { errors },
  } = useForm<FormExampleFormData>({
    resolver: yupResolver(formExampleValidationSchema),
    defaultValues: {
      type: '',
    },
  });

  useEffect(() => {
    (async () => {
      const result = await getBreedList();
      setBreedList(normalizeBreedList(result));
    })();
  }, []);

  const onChange = async (value: string) => {
    const currentBreed = breedList.find((item) => item.value === value);
    const res = currentBreed && (await getServiceList(currentBreed.id));
    setServiceList(res);
  };

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
              options={breedList}
              required
              defaultValue={field.value}
              onChange={(value) => {
                field.onChange(value);
                onChange(value);
              }}
              error={errors?.type?.message}
            />
          )}
        />
      </div>
      <div className={styles.serviceContainer}>
        {serviceList.map((item) => (
          <div className={styles.serviceItemContainer} key={item.id}>
            <ServiceItem item={item} breedName={getValues('type')} />
            <Button type={'submit'} text={'Записатись'} color={'blue'} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default ServicesBlock;
