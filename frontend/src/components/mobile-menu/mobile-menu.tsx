'use client';

import { FC, MouseEvent, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import classNames from 'classnames';

import { Button } from '@/components/button';
import { Icon, IconTypes } from '@/components/icon';
import { useFocusTrapping } from '@/hooks/use-focus-trapping';
import { links } from '@/utils/const';
import { handleScroll, isNavLinkActive } from '@/utils/function';
import useUserStore from '@/store/useUserStore';

import styles from './mobile-menu.module.scss';

type MobileMenuProps = {
  isOpen: boolean;
  onClose: () => void;
  activeSection: string | null;
  onOpenLogin: () => void;
  onOpenBooking: () => void;
};

const MobileMenu: FC<MobileMenuProps> = ({
  isOpen,
  onClose,
  activeSection,
  onOpenLogin,
  onOpenBooking,
}) => {
  const pathname = usePathname();
  const panelRef = useRef<HTMLDivElement>(null);

  const [mounted, setMounted] = useState(false);
  const [modalRoot, setModalRoot] = useState<HTMLElement | null>(null);

  const { user } = useUserStore();

  useFocusTrapping({ ref: panelRef, open: isOpen, onEscape: onClose });

  useEffect(() => {
    setMounted(true);
    setModalRoot(document.getElementById('modal-root'));
  }, []);

  useEffect(() => {
    if (!isOpen || !mounted) return;

    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, mounted]);

  const handleBackdropClick = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleLinkClick = (anchorId?: string) => {
    if (anchorId) handleScroll(anchorId);
    onClose();
  };

  if (!isOpen || !mounted || !modalRoot) return null;

  return createPortal(
    <div className={styles.backdrop} onClick={handleBackdropClick}>
      <div
        className={styles.panel}
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Меню навігації"
        tabIndex={-1}
      >
        <button
          type={'button'}
          className={styles.closeButton}
          onClick={onClose}
          aria-label="Закрити меню"
        >
          <Icon id={IconTypes.close} width={20} height={20} />
        </button>

        <nav>
          <ul className={styles.navList}>
            {links.map(({ href, label, anchorId }) => (
              <li key={label}>
                <Link
                  href={href}
                  className={classNames(
                    styles.navLink,
                    isNavLinkActive(href, anchorId, pathname, activeSection) && styles.navLinkActive
                  )}
                  onClick={() => handleLinkClick(anchorId)}
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <a href="tel:+380501739178" className={styles.phone} onClick={onClose}>
          +380 (50) 173-91-78
        </a>

        <div className={styles.actions}>
          <Button
            type={'button'}
            text={'Записатися'}
            block
            onClick={() => {
              onClose();
              onOpenBooking();
            }}
          />
          {!user && (
            <Button
              type={'button'}
              text={'Увійти'}
              variant={'secondary'}
              block
              onClick={() => {
                onClose();
                onOpenLogin();
              }}
            />
          )}
        </div>
      </div>
    </div>,
    modalRoot
  );
};

export default MobileMenu;
