'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import classNames from 'classnames';

import { Icon } from '@/components/icon';
import useUserStore from '@/store/useUserStore';
import useBookingStore from '@/store/useBookingStore';

import { ADMIN_ACTION, scheduleTitle, tabsFor, type StaffTab } from './nav';
import styles from './staff.module.scss';

const todayLabel = (): string => {
  const formatted = new Intl.DateTimeFormat('uk-UA', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date());

  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
};

const StaffShell = ({ children }: { children: ReactNode }) => {
  const user = useUserStore((state) => state.user);
  const openBooking = useBookingStore((state) => state.openBooking);
  const pathname = usePathname();

  if (!user) return null;

  const tabs = tabsFor(user.role);
  const isActive = (href: string) =>
    href === '/staff' ? pathname === href : pathname.startsWith(href);

  // «+» живе посеред меню адміна: Розклад / Клієнти / + / Події / Ще.
  const bottomItems: (StaffTab | 'action')[] =
    user.role === 'admin' ? [tabs[0]!, tabs[1]!, 'action', tabs[2]!, tabs[3]!] : tabs;

  return (
    <div className={styles.container}>
      <div className={styles.wrapper}>
        <header className={styles.mobileHead}>
          <p className={styles.mobileTitle}>{scheduleTitle(user.role)}</p>
          <p className={styles.mobileDate}>{todayLabel()}</p>
        </header>

        <nav className={styles.tabs} aria-label="Розділи">
          <ul className={styles.tabsList}>
            {tabs.map(({ href, label }) => (
              <li key={href}>
                <Link
                  href={href}
                  className={classNames(styles.tab, isActive(href) && styles.tabActive)}
                  aria-current={isActive(href) ? 'page' : undefined}
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className={styles.panel}>{children}</div>
      </div>

      <nav className={styles.bottomNav} aria-label="Розділи">
        {bottomItems.map((item) =>
          item === 'action' ? (
            <button
              key="action"
              type="button"
              className={styles.bottomAction}
              onClick={() => openBooking()}
              aria-label={ADMIN_ACTION.label}
            >
              <Icon id={ADMIN_ACTION.icon} width={22} height={22} />
            </button>
          ) : (
            <Link
              key={item.href}
              href={item.href}
              className={classNames(
                styles.bottomLink,
                isActive(item.href) && styles.bottomLinkActive
              )}
              aria-current={isActive(item.href) ? 'page' : undefined}
            >
              <Icon id={item.icon} width={20} height={20} />
              <span className={styles.bottomLabel}>{item.label}</span>
            </Link>
          )
        )}
      </nav>
    </div>
  );
};

export default StaffShell;
