import { FC, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { Button } from '@/components/button';

import { useFocusTrapping } from '@/hooks/use-focus-trapping';

import styles from './confirm-modal.module.scss';

type ConfirmModalProps = {
  onConfirm: () => void;
  onCancel: () => void;
  title: string;
  text: string;
  confirmButtonText: string;
  cancelButtonText: string;
};

const ConfirmModal: FC<ConfirmModalProps> = ({
  onConfirm,
  onCancel,
  title,
  text,
  confirmButtonText,
  cancelButtonText,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  const [mounted, setMounted] = useState(false);
  const [modalRoot, setModalRoot] = useState<HTMLElement | null>(null);

  useFocusTrapping({ ref: modalRef, open: true, onEscape: onCancel });

  useEffect(() => {
    setMounted(true);
    setModalRoot(document.getElementById('modal-root'));
  }, []);

  useEffect(() => {
    if (!mounted) return;

    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = '';
    };
  }, [mounted]);

  if (!mounted || !modalRoot) return null;

  return createPortal(
    <div className={styles.backdrop}>
      <div className={styles.modal} ref={modalRef} role="dialog" aria-modal="true" tabIndex={-1}>
        <div className={styles.content}>
          <h2 className={styles.title}>{title}</h2>
          <p className={styles.text}>{text}</p>
          <div className={styles.actions}>
            <Button text={cancelButtonText} onClick={onCancel} className={styles.button} />
            <Button
              text={confirmButtonText}
              onClick={onConfirm}
              variant={'secondary'}
              color={'blue'}
              className={styles.button}
            />
          </div>
        </div>
      </div>
    </div>,
    modalRoot
  );
};

export default ConfirmModal;
