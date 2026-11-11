'use client';

import { useEffect, type ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import classNames from 'classnames';

import { Button } from '@/components/button';
import { Icon } from '@/components/icon';
import useUserStore from '@/store/useUserStore';
import useBookingStore from '@/store/useBookingStore';
import useStaffStore from '@/store/useStaffStore';

import { ADMIN_ACTION, ROLE_LABEL, navFor, scheduleTitle, tabsFor, type StaffTab } from './nav';
import styles from './staff.module.scss';

const StaffShell = ({ children }: { children: ReactNode }) => {
  const { user, logout } = useUserStore();
  const openBooking = useBookingStore((state) => state.openBooking);
  const events = useStaffStore((state) => state.events);
  const loadEvents = useStaffStore((state) => state.load);
  const pathname = usePathname();
  const isAdmin = user?.role === 'admin';

  // Бейдж має бути правдивим на будь-якій вкладці кабінету, не лише на розкладі.
  useEffect(() => {
    if (isAdmin) void loadEvents();
  }, [isAdmin, loadEvents, pathname]);

  if (!user) return null;

  const tabs = tabsFor(user.role);
  const navItems = navFor(user.role);
  const initial = (user.name || user.email).trim().charAt(0).toUpperCase();
  const isActive = (href: string) =>
    href === '/staff' ? pathname === href : pathname.startsWith(href);

  // «+» живе посеред меню адміна: Розклад / Клієнти / + / Події / Ще.
  const bottomItems: (StaffTab | 'action')[] = isAdmin
    ? [navItems[0]!, navItems[1]!, 'action', navItems[2]!, navItems[3]!]
    : navItems;

  // Мобільна шапка називає поточну вкладку; у розкладу є власна з датою.
  const title =
    pathname === '/staff'
      ? ''
      : (tabs.find((tab) => tab.href !== '/staff' && pathname.startsWith(tab.href))?.label ??
        navItems.find((tab) => tab.href !== '/staff' && pathname.startsWith(tab.href))?.label ??
        scheduleTitle(user.role));

  return (
    <div className={styles.container}>
      <div className={styles.wrapper}>
        {title && (
          <header className={styles.mobileHead}>
            <p className={styles.mobileTitle}>{title}</p>
          </header>
        )}

        <header className={styles.head}>
          <div className={styles.identity}>
            {user.photoUrl ? (
              <Image className={styles.photo} src={user.photoUrl} alt="" width={128} height={128} />
            ) : (
              <span className={styles.photoFallback} aria-hidden="true">
                {initial}
              </span>
            )}
            <div>
              <h1 className={styles.title}>{user.name || 'Кабінет персоналу'}</h1>
              <span className={classNames(styles.role, isAdmin && styles.roleAdmin)}>
                {ROLE_LABEL[user.role]}
              </span>
            </div>
          </div>

          <div className={styles.headActions}>
            {isAdmin && (
              <Button
                type="button"
                text="+ Новий запис"
                size="medium"
                onClick={() => openBooking({ admin: true, source: 'button' })}
              />
            )}
            <Button
              className={styles.logout}
              type="button"
              text="Вийти"
              variant="secondary"
              size="medium"
              onClick={logout}
            />
          </div>
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
              onClick={() => openBooking({ admin: true, source: 'button' })}
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
              <span className={styles.bottomIcon}>
                <Icon id={item.icon} width={20} height={20} />
                {item.href === '/staff/events' && events.length > 0 && (
                  <span className={styles.bottomBadge}>{events.length}</span>
                )}
              </span>
              <span className={styles.bottomLabel}>{item.label}</span>
            </Link>
          )
        )}
      </nav>
    </div>
  );
};

export default StaffShell;
