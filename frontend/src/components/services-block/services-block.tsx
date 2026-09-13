'use client';
import { useState } from 'react';

import styles from './services-block.module.scss';
import { Select } from '@/components/select';
import ServiceItem from '@/components/service-item/service-item';
import { Button } from '@/components/button';
import { BreedProps, ServiceProps } from '@/utils/function';
import { getServiceList } from '@/api/service';
import useBookingStore from '@/store/useBookingStore';
import { useReveal } from '@/hooks/use-reveal';

type ServicesBlockProps = {
  breedList: BreedProps[];
  initialBreedName: string;
  initialServiceList: ServiceProps[];
};

const ServicesBlock = ({ breedList, initialBreedName, initialServiceList }: ServicesBlockProps) => {
  const [breedName, setBreedName] = useState(initialBreedName);
  const [serviceList, setServiceList] = useState<ServiceProps[]>(initialServiceList);
  const openBooking = useBookingStore((state) => state.openBooking);
  const revealRef = useReveal<HTMLDivElement>();

  const onChange = async (value: string) => {
    setBreedName(value);
    const currentBreed = breedList.find((item) => item.value === value);
    const res = currentBreed && (await getServiceList(currentBreed.id));
    setServiceList(res ?? []);
  };

  return (
    <div className={styles.container} id={'services'}>
      <h2 className={styles.title}>Послуги</h2>
      <div className={styles.selectBlock}>
        <p className={styles.selectBlockText}>Оберіть вашого улюбленця</p>
        <Select
          className={styles.select}
          options={breedList}
          required
          defaultValue={initialBreedName}
          onChange={onChange}
        />
      </div>
      <div className={styles.serviceContainer}>
        {serviceList.map((item, index) => (
          <div
            className={`${styles.serviceItemContainer} reveal`}
            key={item.id}
            ref={revealRef}
            data-d={(index % 4) + 1}
          >
            <ServiceItem item={item} breedName={breedName} />
            <Button
              type={'button'}
              text={'Записатись'}
              color={'blue'}
              onClick={() => openBooking({ service: item, breedName })}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default ServicesBlock;
