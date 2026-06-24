import classNames from 'classnames';

import { Select } from '@/components/select';
import { Button } from '@/components/button';
import { Icon, IconTypes } from '@/components/icon';
import { BreedProps, ServiceProps } from '@/utils/function';

import styles from './booking-modal.module.scss';

type StepServicesProps = {
  breedList: BreedProps[];
  serviceList: ServiceProps[];
  selectedBreed: BreedProps | null;
  selectedServices: ServiceProps[];
  onBreedChange: (value: string) => void;
  onToggleService: (service: ServiceProps) => void;
  onNext: () => void;
};

const StepServices = ({
  breedList,
  serviceList,
  selectedBreed,
  selectedServices,
  onBreedChange,
  onToggleService,
  onNext,
}: StepServicesProps) => (
  <div className={styles.stepContainer}>
    <h2 className={styles.title}>Оберіть послугу</h2>

    <div className={styles.section}>
      <p className={styles.sectionLabel}>Ваш улюбленець</p>
      <Select
        options={breedList}
        defaultValue={selectedBreed?.value ?? ''}
        onChange={onBreedChange}
      />
    </div>

    <div className={classNames(styles.section, styles.sectionGrow)}>
      <p className={styles.sectionLabel}>Послуга</p>
      <ul className={styles.serviceList}>
        {serviceList.map((service) => {
          const isChecked = selectedServices.some((s) => s.id === service.id);
          return (
            <li
              key={service.id}
              className={classNames(styles.serviceItem, {
                [styles.serviceItemSelected]: isChecked,
              })}
              onClick={() => onToggleService(service)}
            >
              <span
                className={classNames(styles.checkbox, {
                  [styles.checkboxChecked]: isChecked,
                })}
              >
                {isChecked && <Icon id={IconTypes.check} width={12} height={12} color="#fff" />}
              </span>
              <div className={styles.serviceItemContent}>
                <div className={styles.serviceItemFirstRow}>
                  <p className={styles.serviceItemTitle}>{service.type}</p>
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
        onClick={onNext}
      />
    </div>
  </div>
);

export default StepServices;
