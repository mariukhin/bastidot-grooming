'use client';

import type { ReactNode } from 'react';
import classNames from 'classnames';

import { Button } from '@/components/button';
import useBookingStore from '@/store/useBookingStore';

import styles from './account-state.module.scss';

/** Скелетон списку: висота рядків підібрана під справжні картки, щоб після
 *  завантаження нічого не стрибало. */
export const ListSkeleton = ({ rows = 3 }: { rows?: number }) => (
  <ul className={styles.skeletonList} aria-hidden="true">
    {Array.from({ length: rows }, (_, i) => (
      <li key={i} className={styles.skeletonCard}>
        <span className={styles.skeletonAvatar} />
        <span className={styles.skeletonLines}>
          <span className={styles.skeletonLine} />
          <span className={classNames(styles.skeletonLine, styles.skeletonLineShort)} />
        </span>
      </li>
    ))}
  </ul>
);

export const LoadingState = ({ label }: { label: string }) => (
  <>
    <p className={styles.srOnly} role="status" aria-live="polite">
      {label}
    </p>
    <ListSkeleton />
  </>
);

export const EmptyState = ({
  title,
  text,
  action,
}: {
  title: string;
  text: string;
  action?: ReactNode;
}) => (
  <div className={styles.empty}>
    <p className={styles.emptyTitle}>{title}</p>
    <p className={styles.emptyText}>{text}</p>
    {action}
  </div>
);

export const BookingCta = ({ text = 'Записатись' }: { text?: string }) => {
  const openBooking = useBookingStore((state) => state.openBooking);
  return <Button type="button" text={text} size="medium" onClick={() => openBooking()} />;
};

export const ErrorState = ({ message, onRetry }: { message: string; onRetry: () => void }) => (
  <div className={styles.error} role="alert">
    <p className={styles.errorText}>{message}</p>
    <Button
      type="button"
      text="Спробувати ще раз"
      variant="secondary"
      size="medium"
      onClick={onRetry}
    />
  </div>
);
