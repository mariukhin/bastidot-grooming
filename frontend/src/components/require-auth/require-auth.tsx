'use client';

import { useEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';

import useUserStore, { type Role } from '@/store/useUserStore';
import useLoginStore from '@/store/useLoginStore';

import styles from './require-auth.module.scss';

type RequireAuthProps = {
  children: ReactNode;
  /** Якщо задано — пускаємо лише ці ролі. Порожнє означає «будь-хто залогінений». */
  roles?: Role[];
};

/**
 * Guard для сторінок, які вимагають входу.
 *
 * Поки сесія не відновилась (isReady === false), не редиректимо: збережена
 * сесія підтягується вже на клієнті, і поспішний редирект викидав би
 * залогінену людину зі сторінки, на яку вона має право.
 */
const RequireAuth = ({ children, roles }: RequireAuthProps) => {
  const { user, isReady } = useUserStore();
  const openLogin = useLoginStore((state) => state.openLogin);
  const router = useRouter();
  const pathname = usePathname();

  const allowed = Boolean(user) && (!roles?.length || (user && roles.includes(user.role)));

  useEffect(() => {
    if (!isReady || allowed) return;

    if (!user) {
      // Назад на головну з відкритою модалкою входу: після успіху вона поверне
      // людину сюди ж.
      router.replace('/');
      openLogin(pathname);
      return;
    }

    // Залогінений, але не тієї ролі — відправляти в модалку входу безглуздо.
    router.replace('/');
  }, [isReady, allowed, user, router, openLogin, pathname]);

  if (!isReady || !allowed) {
    return (
      <div className={styles.pending} role="status" aria-live="polite">
        <span className={styles.spinner} aria-hidden="true" />
        <p className={styles.text}>{isReady ? 'Потрібен вхід…' : 'Перевіряємо сесію…'}</p>
      </div>
    );
  }

  return <>{children}</>;
};

export default RequireAuth;
