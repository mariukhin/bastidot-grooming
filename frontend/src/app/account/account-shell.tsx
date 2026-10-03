'use client';

import type { ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import classNames from 'classnames';

import { Button } from '@/components/button';
import useUserStore from '@/store/useUserStore';

import styles from './account.module.scss';

const TABS = [
  { href: '/account', label: 'Профіль' },
  { href: '/account/pets', label: 'Улюбленці' },
  { href: '/account/visits', label: 'Візити' },
] as const;

const AccountShell = ({ children }: { children: ReactNode }) => {
  const { user, logout } = useUserStore();
  const pathname = usePathname();

  if (!user) return null;

  const initial = (user.name || user.email).trim().charAt(0).toUpperCase();

  return (
    <div className={styles.container}>
      <div className={styles.wrapper}>
        <header className={styles.head}>
          <div className={styles.identity}>
            {user.photoUrl ? (
              <Image className={styles.photo} src={user.photoUrl} alt="" width={128} height={128} />
            ) : (
              <span className={styles.photoFallback} aria-hidden="true">
                {initial}
              </span>
            )}
            <div className={styles.identityText}>
              <h1 className={styles.title}>{user.name || 'Мій кабінет'}</h1>
              <p className={styles.email}>{user.email}</p>
            </div>
          </div>

          <Button
            className={styles.logout}
            type="button"
            text="Вийти"
            variant="secondary"
            size="medium"
            onClick={logout}
          />
        </header>

        <nav className={styles.tabs} aria-label="Розділи кабінету">
          <ul className={styles.tabsList}>
            {TABS.map(({ href, label }) => {
              // /account збігається з усім, тож точний матч — тільки для нього.
              const isActive = href === '/account' ? pathname === href : pathname.startsWith(href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    className={classNames(styles.tab, isActive && styles.tabActive)}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className={styles.panel}>{children}</div>
      </div>
    </div>
  );
};

export default AccountShell;
