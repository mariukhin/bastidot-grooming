import classNames from 'classnames';

import { Button } from '@/components/button';
import { Icon, IconTypes } from '@/components/icon';
import { ServiceProps } from '@/utils/function';
import { Groomer } from './types';
import SummaryCard from './summary-card';

import styles from './booking-modal.module.scss';

type StepExtraServicesProps = {
  extraServiceList: ServiceProps[];
  selectedExtraServices: ServiceProps[];
  onToggleExtraService: (service: ServiceProps) => void;
  onNext: () => void;
  selectedServices: ServiceProps[];
  selectedGroomer: Groomer | null;
  formattedDateTime: string | null;
  isSummaryExpanded: boolean;
  onToggleSummary: () => void;
};

const StepExtraServices = ({
  extraServiceList,
  selectedExtraServices,
  onToggleExtraService,
  onNext,
  selectedServices,
  selectedGroomer,
  formattedDateTime,
  isSummaryExpanded,
  onToggleSummary,
}: StepExtraServicesProps) => (
  <div className={styles.stepContainer}>
    <h2 className={styles.title}>Додаткові послуги</h2>
    <p className={styles.subtitle}>Зробіть улюбленця щасливішим</p>

    <div className={classNames(styles.section, styles.sectionGrow)}>
      <ul className={styles.serviceList}>
        {extraServiceList.map((service) => {
          const isChecked = selectedExtraServices.some((s) => s.id === service.id);
          return (
            <li
              key={service.id}
              className={classNames(styles.extraServiceItem, {
                [styles.serviceItemSelected]: isChecked,
              })}
              onClick={() => onToggleExtraService(service)}
            >
              <span
                className={classNames(styles.checkbox, {
                  [styles.checkboxChecked]: isChecked,
                })}
              >
                {isChecked && <Icon id={IconTypes.check} width={12} height={12} color="#fff" />}
              </span>
              <p className={styles.extraServiceName}>{service.type}</p>
              <p className={styles.extraServicePrice}>{service.defaultPrice} грн</p>
            </li>
          );
        })}
        {extraServiceList.length === 0 && (
          <p className={styles.emptyText}>Немає додаткових послуг для цієї породи</p>
        )}
      </ul>
    </div>

    <div className={styles.footer}>
      <SummaryCard
        selectedServices={selectedServices}
        selectedGroomer={selectedGroomer}
        formattedDateTime={formattedDateTime}
        isSummaryExpanded={isSummaryExpanded}
        onToggle={onToggleSummary}
        selectedExtraServices={selectedExtraServices}
      >
        <Button text="Далі" size="large" onClick={onNext} />
      </SummaryCard>
    </div>
  </div>
);

export default StepExtraServices;
