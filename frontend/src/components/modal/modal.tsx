import classNames from 'classnames';
import { FC, ReactNode, MouseEvent, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { Icon, IconTypes } from '@/components/icon';
import styles from './modal.module.scss';

type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  backdropClassName?: string;
  modalClassName?: string;
};

const Modal: FC<ModalProps> = ({
  isOpen,
  onClose,
  backdropClassName,
  modalClassName,
  children,
}) => {
  const backdropRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedElement = useRef<HTMLElement | null>(null);

  const [mounted, setMounted] = useState(false);
  const [modalRoot, setModalRoot] = useState<HTMLElement | null>(null);

  const getFocusableElements = (): HTMLElement[] => {
    if (!modalRef.current) return [];
    return Array.from(
      modalRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
      )
    ).filter((el) => !el.hasAttribute('disabled') && !el.getAttribute('aria-hidden'));
  };

  useEffect(() => {
    setMounted(true);
    setModalRoot(document.getElementById('modal-root'));
  }, []);

  useEffect(() => {
    if (!isOpen || !mounted) return;

    // scroll to top
    requestAnimationFrame(() => {
      backdropRef.current?.scrollTo({ top: 0 });
    });

    previouslyFocusedElement.current = document.activeElement as HTMLElement;

    const focusFirstElement = () => {
      const focusable = getFocusableElements();
      if (focusable.length > 0) {
        focusable[0].focus();
      } else {
        modalRef.current?.focus();
      }
    };

    focusFirstElement();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === 'Tab') {
        const focusable = getFocusableElements();
        if (focusable.length === 0) {
          e.preventDefault();
          modalRef.current?.focus();
          return;
        }

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    const handleFocusIn = (e: FocusEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        const focusable = getFocusableElements();
        (focusable[0] || modalRef.current)?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('focusin', handleFocusIn);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('focusin', handleFocusIn);
      document.body.style.overflow = '';
      previouslyFocusedElement.current?.focus();
    };
  }, [isOpen, onClose, mounted]);

  const handleBackdropClick = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!mounted || !modalRoot || !isOpen) return null;

  return createPortal(
    <div
      className={classNames(styles.backdrop, backdropClassName)}
      onClick={handleBackdropClick}
      ref={backdropRef}
    >
      <div
        className={classNames(styles.modal, modalClassName)}
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
      >
        <button type="button" className={styles.close} onClick={onClose} aria-label="Close modal">
          <Icon id={IconTypes.close} width={16} height={16} />
        </button>
        <div className={styles.content}>{children}</div>
      </div>
    </div>,
    modalRoot
  );
};

export default Modal;
