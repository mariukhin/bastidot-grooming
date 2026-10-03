'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

import { Icon, IconTypes } from '@/components/icon';
import useUserStore, { type SessionUser } from '@/store/useUserStore';

import styles from './user-menu.module.scss';

type UserMenuProps = {
  user: SessionUser;
  className?: string;
};

const initials = (user: SessionUser): string => {
  const source = user.name.trim() || user.email.trim();
  if (!source) return '?';

  const parts = source.split(/[\s@._-]+/).filter(Boolean);
  return parts
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('');
};

const UserMenu = ({ user, className }: UserMenuProps) => {
  const logout = useUserStore((state) => state.logout);
  const [isOpen, setIsOpen] = useState(false);
  const [photoFailed, setPhotoFailed] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!isOpen) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setIsOpen(false);
      triggerRef.current?.focus();
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen]);

  const showPhoto = Boolean(user.photoUrl) && !photoFailed;

  return (
    <div className={className} ref={wrapperRef}>
      <div className={styles.wrapper}>
        <button
          type="button"
          ref={triggerRef}
          className={styles.trigger}
          onClick={() => setIsOpen((prev) => !prev)}
          aria-expanded={isOpen}
          aria-haspopup="menu"
          aria-controls={menuId}
          aria-label={isOpen ? 'Закрити меню профілю' : 'Відкрити меню профілю'}
        >
          {showPhoto ? (
            // Без unoptimized: картинку тягне сервер Next і віддає зі свого
            // домену. Інакше браузер іде на googleusercontent напряму, і той
            // може відповісти 403 — тоді замість фото падали ініціали.
            <Image
              className={styles.photo}
              src={user.photoUrl}
              alt=""
              width={96}
              height={96}
              onError={() => setPhotoFailed(true)}
            />
          ) : (
            <span className={styles.initials} aria-hidden="true">
              {initials(user)}
            </span>
          )}
        </button>

        {isOpen && (
          <div className={styles.menu} id={menuId} role="menu">
            <div className={styles.identity}>
              {user.name && <p className={styles.name}>{user.name}</p>}
              <p className={styles.email}>{user.email}</p>
            </div>

            <Link
              href="/account"
              className={styles.item}
              role="menuitem"
              onClick={() => setIsOpen(false)}
            >
              <Icon id={IconTypes.userCircle} width={16} height={16} />
              Профіль
            </Link>

            <button
              type="button"
              className={styles.item}
              role="menuitem"
              onClick={() => {
                setIsOpen(false);
                logout();
              }}
            >
              <Icon id={IconTypes.close} width={14} height={14} />
              Вийти
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserMenu;
