'use client';

import { useEffect, useState } from 'react';
import Image, { StaticImageData } from 'next/image';
import classNames from 'classnames';

import { Modal } from '@/components/modal';
import { Select } from '@/components/select';
import { Button } from '@/components/button';
import { Icon, IconTypes } from '@/components/icon';

import { BreedProps, normalizeBreedList, ServiceProps } from '@/utils/function';
import { getBreedList } from '@/api/breed';
import { getServiceList } from '@/api/service';

import groomerPreview from '@/components/team-block/groomerPreview.png';

import styles from './booking-modal.module.scss';

type BookingStep = 'services' | 'groomer';

type Groomer = {
  id: number;
  name: string;
  isVip: boolean;
  photoSrc: StaticImageData;
  nextTime: string;
};

const GROOMERS: Groomer[] = [
  {
    id: 1,
    name: 'Ольга',
    isVip: false,
    photoSrc: groomerPreview,
    nextTime: '12 травня 12:00',
  },
  {
    id: 2,
    name: 'Юлія',
    isVip: false,
    photoSrc: groomerPreview,
    nextTime: '12 травня 12:00',
  },
];

type BookingModalProps = {
  isOpen: boolean;
  onClose: () => void;
  initialBreed?: string;
  initialService?: ServiceProps;
};

const BookingModal = ({ isOpen, onClose, initialBreed, initialService }: BookingModalProps) => {
  const [step, setStep] = useState<BookingStep>('services');

  const [breedList, setBreedList] = useState<BreedProps[]>([]);
  const [serviceList, setServiceList] = useState<ServiceProps[]>([]);
  const [selectedBreed, setSelectedBreed] = useState<BreedProps | null>(null);
  const [selectedServices, setSelectedServices] = useState<ServiceProps[]>(
    initialService ? [initialService] : []
  );
  const [selectedGroomer, setSelectedGroomer] = useState<Groomer | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    setStep('services');
    setSelectedServices(initialService ? [initialService] : []);
    setSelectedGroomer(null);

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

  const toggleService = (service: ServiceProps) => {
    setSelectedServices((prev) =>
      prev.some((s) => s.id === service.id)
        ? prev.filter((s) => s.id !== service.id)
        : [...prev, service]
    );
  };

  const handleClose = () => {
    onClose();
  };

  const groomerPrice = (groomer: Groomer) => {
    if (selectedServices.length === 0) return null;
    const service = selectedServices[0];
    return groomer.isVip ? service.vipPrice : service.defaultPrice;
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} modalClassName={styles.bookingModal}>
      {step === 'services' && (
        <div className={styles.stepContainer}>
          <h2 className={styles.title}>Оберіть послугу</h2>

          <div className={styles.section}>
            <p className={styles.sectionLabel}>Ваш улюбленець</p>
            <Select
              options={breedList}
              defaultValue={selectedBreed?.value ?? ''}
              onChange={handleBreedChange}
            />
          </div>

          <div className={styles.section}>
            <p className={styles.sectionLabel}>Послуга</p>
            <ul className={styles.serviceList}>
              {serviceList.map((service) => {
                const isChecked = selectedServices.some((s) => s.id === service.id);
                return (
                  <li
                    key={service.id}
                    className={classNames(styles.serviceItem, { [styles.serviceItemSelected]: isChecked })}
                    onClick={() => toggleService(service)}
                  >
                    <span className={classNames(styles.checkbox, { [styles.checkboxChecked]: isChecked })}>
                      {isChecked && <Icon id={IconTypes.check} width={12} height={12} color="#fff" />}
                    </span>
                    <div className={styles.serviceItemContent}>
                      <div className={styles.serviceItemFirstRow}>
                        <p className={styles.serviceItemTitle}>
                          {service.type}
                        </p>
                        <Icon id={IconTypes.info} color="var(--color-gray)" width={16} height={16} />
                      </div>
                      <div className={styles.serviceItemRow}>
                        <Icon id={IconTypes.money} color="var(--color-gray)" width={19} height={13} />
                        <p className={styles.serviceItemMeta}>
                          Грумер – {service.defaultPrice} грн. | VIP Грумер – {service.vipPrice} грн
                        </p>
                      </div>
                      <div className={styles.serviceItemRow}>
                        <Icon id={IconTypes.clock} color="var(--color-gray)" width={16} height={16} />
                        <p className={styles.serviceItemMeta}>
                          {service.durationHour ? `${service.durationHour} год` : ''}{' '}
                          {service.durationMin ? `${service.durationMin} хв` : ''}
                        </p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className={styles.footer}>
            <Button
              text="Обрати майстра"
              size="large"
              disabled={selectedServices.length === 0}
              onClick={() => setStep('groomer')}
            />
          </div>
        </div>
      )}

      {step === 'groomer' && (
        <div className={styles.stepContainer}>
          <button type="button" className={styles.backButton} onClick={() => setStep('services')}>
            <Icon id={IconTypes.chevronLeft} width={20} height={20} />
          </button>

          <h2 className={styles.title}>Оберіть майстра</h2>

          <div className={styles.section}>
            <p className={styles.sectionLabel}>Майстер</p>
            <ul className={styles.groomerList}>
              {GROOMERS.map((groomer) => {
                const isSelected = selectedGroomer?.id === groomer.id;
                const price = groomerPrice(groomer);
                return (
                  <li
                    key={groomer.id}
                    className={classNames(styles.groomerItem, { [styles.groomerItemSelected]: isSelected })}
                    onClick={() => setSelectedGroomer(groomer)}
                  >
                    <span className={classNames(styles.radio, { [styles.radioSelected]: isSelected })} />
                    <Image
                      className={styles.groomerPhoto}
                      src={groomer.photoSrc}
                      width={60}
                      height={60}
                      alt={groomer.name}
                    />
                    <div className={styles.groomerInfo}>
                      <p className={styles.groomerName}>{groomer.name}</p>
                      <div className={styles.groomerBadges}>
                        {groomer.isVip && <span className={styles.vipBadge}>VIP</span>}
                        <span className={styles.groomerRole}>Грумер</span>
                      </div>
                      <div className={styles.groomerTime}>
                        <Icon id={IconTypes.clock} color="var(--color-gray)" width={14} height={14} />
                        <p className={styles.groomerTimeMeta}>Наступний час: {groomer.nextTime}</p>
                      </div>
                    </div>
                    {price !== null && <p className={styles.groomerPrice}>{price} грн</p>}
                  </li>
                );
              })}
            </ul>
          </div>

          <div className={styles.groomerFooter}>
            <div className={styles.groomerSummary}>
              <Icon id={IconTypes.heart} color="var(--color-gray)" width={18} height={18} />
              <p className={styles.groomerSummaryText}>
                {selectedServices[0]?.type}
              </p>
            </div>
            <Button
              text="Обрати дату та час"
              size="large"
              disabled={!selectedGroomer}
            />
          </div>
        </div>
      )}
    </Modal>
  );
};

export default BookingModal;
