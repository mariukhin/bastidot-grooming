import classNames from 'classnames';
import { FC, ReactNode, MouseEvent, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import SimpleBar from 'simplebar-react';
import type SimpleBarCore from 'simplebar-core';

import { Icon, IconTypes } from '@/components/icon';

import { useFocusTrapping } from '@/hooks/use-focus-trapping';

import styles from './modal.module.scss';

type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  backdropClassName?: string;
  modalClassName?: string;
  disableScrollbar?: boolean;
  backButton?: ReactNode;
};

const Modal: FC<ModalProps> = ({
  isOpen,
  onClose,
  backdropClassName,
  modalClassName,
  disableScrollbar,
  backButton,
  children,
}) => {
  const backdropRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const simpleBarRef = useRef<SimpleBarCore>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useFocusTrapping({ ref: modalRef, open: isOpen, onEscape: onClose });

  const [mounted, setMounted] = useState(false);
  const [modalRoot, setModalRoot] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setMounted(true);
    setModalRoot(document.getElementById('modal-root'));
  }, []);

  useEffect(() => {
    if (!isOpen || disableScrollbar || !contentRef.current) return;

    const observer = new ResizeObserver(() => {
      simpleBarRef.current?.recalculate();
    });
    observer.observe(contentRef.current);

    return () => observer.disconnect();
  }, [isOpen, disableScrollbar]);

  useEffect(() => {
    if (!isOpen || !mounted) return;

    // scroll to top
    requestAnimationFrame(() => {
      backdropRef.current?.scrollTo({ top: 0 });
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
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
        {disableScrollbar ? (
          <>
            {backButton && <div className={styles.back}>{backButton}</div>}
            <button type="button" className={styles.close} onClick={onClose} aria-label="Close modal">
              <Icon id={IconTypes.close} width={16} height={16} />
            </button>
            <div ref={contentRef} className={classNames(styles.content, styles.contentFill)}>{children}</div>
          </>
        ) : (
          <SimpleBar ref={simpleBarRef} autoHide={false} style={{ height: '100%' }}>
            {backButton && <div className={styles.back}>{backButton}</div>}
            <button type="button" className={styles.close} onClick={onClose} aria-label="Close modal">
              <Icon id={IconTypes.close} width={16} height={16} />
            </button>
            <div ref={contentRef} className={styles.content}>{children}</div>
          </SimpleBar>
        )}
      </div>
    </div>,
    modalRoot
  );
};

export default Modal;
