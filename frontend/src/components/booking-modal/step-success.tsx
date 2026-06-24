'use client';

import { useState } from 'react';
import Image from 'next/image';

import { Button } from '@/components/button';
import { Icon, IconTypes } from '@/components/icon';
import { ServiceProps } from '@/utils/function';
import { Groomer } from './types';
import { getGroomerPrice } from './utils';

import styles from './booking-modal.module.scss';

type StepSuccessProps = {
  selectedServices: ServiceProps[];
  selectedExtraServices: ServiceProps[];
  selectedGroomer: Groomer | null;
  formattedDateTimeRange: string | null;
  onBookAgain: () => void;
  onClose: () => void;
};

const SuccessIllustration = () => (
  <svg viewBox="0 0 200 200" width="140" height="140" xmlns="http://www.w3.org/2000/svg">
    {/* Rays */}
    <g stroke="#c6f0d0" strokeLinecap="round">
      <line x1="100" y1="18" x2="100" y2="48" strokeWidth="5" />
      <line x1="100" y1="152" x2="100" y2="182" strokeWidth="5" />
      <line x1="18" y1="100" x2="48" y2="100" strokeWidth="5" />
      <line x1="152" y1="100" x2="182" y2="100" strokeWidth="5" />
      <line x1="36" y1="36" x2="56" y2="56" strokeWidth="4" />
      <line x1="144" y1="144" x2="164" y2="164" strokeWidth="4" />
      <line x1="164" y1="36" x2="144" y2="56" strokeWidth="4" />
      <line x1="36" y1="164" x2="56" y2="144" strokeWidth="4" />
      <line x1="66" y1="16" x2="72" y2="36" strokeWidth="3.5" />
      <line x1="134" y1="164" x2="128" y2="184" strokeWidth="3.5" />
      <line x1="184" y1="66" x2="164" y2="72" strokeWidth="3.5" />
      <line x1="16" y1="134" x2="36" y2="128" strokeWidth="3.5" />
      <line x1="134" y1="16" x2="128" y2="36" strokeWidth="3.5" />
      <line x1="66" y1="164" x2="72" y2="184" strokeWidth="3.5" />
      <line x1="16" y1="66" x2="36" y2="72" strokeWidth="3.5" />
      <line x1="184" y1="134" x2="164" y2="128" strokeWidth="3.5" />
    </g>
    {/* Stars */}
    <g fill="#a8e6c0">
      {/* top-left star */}
      <path d="M52 44 L54 48 L58 44 L54 40 Z" />
      <path d="M50 42 L54 44 L58 42 L54 40 Z" opacity="0" />
      <polygon points="52,40 53.5,43.5 57,44 53.5,46.5 54.5,50 52,47.5 49.5,50 50.5,46.5 47,44 50.5,43.5" />
      {/* top-right star */}
      <polygon points="148,40 149.5,43.5 153,44 149.5,46.5 150.5,50 148,47.5 145.5,50 146.5,46.5 143,44 146.5,43.5" />
      {/* bottom-right star */}
      <polygon points="148,150 149.5,153.5 153,154 149.5,156.5 150.5,160 148,157.5 145.5,160 146.5,156.5 143,154 146.5,153.5" />
      {/* bottom-left star */}
      <polygon points="52,150 53.5,153.5 57,154 53.5,156.5 54.5,160 52,157.5 49.5,160 50.5,156.5 47,154 50.5,153.5" />
      {/* right small */}
      <polygon points="172,90 173,92.5 175.5,92.5 173.5,94.5 174,97 172,95.5 170,97 170.5,94.5 168.5,92.5 171,92.5" />
      {/* left small */}
      <polygon points="28,90 29,92.5 31.5,92.5 29.5,94.5 30,97 28,95.5 26,97 26.5,94.5 24.5,92.5 27,92.5" />
      {/* top small */}
      <polygon points="100,20 101,22.5 103.5,22.5 101.5,24.5 102,27 100,25.5 98,27 98.5,24.5 96.5,22.5 99,22.5" />
      {/* bottom small */}
      <polygon points="100,173 101,175.5 103.5,175.5 101.5,177.5 102,180 100,178.5 98,180 98.5,177.5 96.5,175.5 99,175.5" />
    </g>
    {/* Green circle */}
    <circle cx="100" cy="100" r="38" fill="#22c55e" />
    {/* White checkmark */}
    <polyline
      points="83,101 95,113 119,88"
      fill="none"
      stroke="white"
      strokeWidth="5.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const StepSuccess = ({
  selectedServices,
  selectedExtraServices,
  selectedGroomer,
  formattedDateTimeRange,
  onBookAgain,
  onClose,
}: StepSuccessProps) => {
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const extraTotal = selectedExtraServices.reduce((sum, s) => sum + s.defaultPrice, 0);
  const basePrice = selectedGroomer ? getGroomerPrice(selectedGroomer, selectedServices) : null;
  const totalPrice = basePrice !== null ? basePrice + extraTotal : null;

  const serviceNames = [selectedServices[0]?.type, ...selectedExtraServices.map((s) => s.type)]
    .filter(Boolean)
    .join(', ');

  return (
    <div className={styles.successContainer}>
      <div className={styles.successIllustration}>
        <SuccessIllustration />
      </div>

      <h2 className={styles.successTitle}>Ви успішно записались!</h2>
      <p className={styles.successSubtitle}>Будемо чекати на Вас та Вашого улюбленця</p>

      <div className={styles.successSummary}>
        <div className={styles.successSummaryRow}>
          <p className={styles.successSummaryMain}>{serviceNames}</p>
          {totalPrice !== null && (
            <p className={styles.successSummaryPrice}>{totalPrice} грн</p>
          )}
        </div>
        {formattedDateTimeRange && (
          <p className={styles.successSummaryDate}>{formattedDateTimeRange}</p>
        )}
        {selectedGroomer && (
          <div className={styles.successGroomerRow}>
            <Image
              src={selectedGroomer.photoSrc}
              width={36}
              height={36}
              alt={selectedGroomer.name}
              className={styles.successGroomerPhoto}
            />
            <div>
              <p className={styles.successGroomerName}>{selectedGroomer.name}</p>
              <p className={styles.successGroomerRole}>
                {selectedGroomer.isVip ? 'VIP-Грумер' : 'Грумер'}
              </p>
            </div>
          </div>
        )}
      </div>

      <Button text="Записатися ще" size="large" onClick={onBookAgain} />

      <div className={styles.successActions}>
        <button type="button" className={styles.successActionBtn}>
          <Icon id={IconTypes.calendarAdd} width={16} height={16} color="var(--color-milano-red)" />
          Додати в календар
        </button>
        <button
          type="button"
          className={styles.successActionBtn}
          onClick={() => setShowCancelConfirm(true)}
        >
          <Icon id={IconTypes.close} width={14} height={14} color="var(--color-woodsmoke)" />
          Скасувати запис
        </button>
      </div>

      <div className={styles.successContacts}>
        <p className={styles.successContactsTitle}>Контакти Bastidot</p>
        <div className={styles.successContactRow}>
          <Icon id={IconTypes.point} width={16} height={16} color="var(--color-gray)" />
          <p className={styles.successContactText}>
            Велика Васильківська, 23А, Київ, 02000, Україна
          </p>
        </div>
        <div className={styles.successContactRow}>
          <Icon id={IconTypes.phone} width={16} height={16} color="var(--color-gray)" />
          <p className={styles.successContactText}>+380 (50) 173-91-78</p>
        </div>
        <div className={styles.successMap}>
          <iframe
            title="Bastidot location"
            src="https://maps.google.com/maps?q=Велика+Васильківська+23А+Київ&output=embed&z=16"
            width="100%"
            height="160"
            style={{ border: 0, borderRadius: 12 }}
            loading="lazy"
          />
        </div>
      </div>

      {showCancelConfirm && (
        <div className={styles.cancelOverlay}>
          <div className={styles.cancelPopup}>
            <p className={styles.cancelTitle}>Ви впевнені, що хочете скасувати запис?</p>
            <p className={styles.cancelSubtitle}>
              Його не можна буде відновити. Ви зможете зробити новий запис
            </p>
            <div className={styles.cancelActions}>
              <button type="button" className={styles.cancelConfirmBtn} onClick={onClose}>
                Скасувати
              </button>
              <button
                type="button"
                className={styles.cancelDenyBtn}
                onClick={() => setShowCancelConfirm(false)}
              >
                Не скасовувати
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StepSuccess;
