'use client';

import { useEffect } from 'react';
import classNames from 'classnames';

import useToastStore from '@/store/useToastStore';

import styles from './toast.module.scss';

const VISIBLE_MS = 4000;

const Toast = () => {
  const { message, tone, shownAt, hideToast } = useToastStore();

  useEffect(() => {
    if (!message) return;

    const timer = setTimeout(hideToast, VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [message, shownAt, hideToast]);

  if (!message) return null;

  return (
    <div className={classNames(styles.toast, styles[tone])} role="status" aria-live="polite">
      {message}
    </div>
  );
};

export default Toast;
