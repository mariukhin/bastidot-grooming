'use client';

import Link from 'next/link';
import classNames from 'classnames';

import { Icon, IconTypes } from '@/components/icon';
import useUserStore from '@/store/useUserStore';

import { ADMIN_MORE } from '../nav';
import styles from '../staff.module.scss';

/** «Ще» з мобільного меню адміна: розділи, що не влізли в нижнє меню, і вихід. */
const Page = () => {
  const logout = useUserStore((state) => state.logout);

  return (
    <ul className={styles.moreList}>
      {ADMIN_MORE.map(({ href, label, icon, disabled }) => (
        <li key={href}>
          {disabled ? (
            <span
              className={classNames(styles.moreItem, styles.moreItemDisabled)}
              aria-disabled="true"
            >
              <Icon id={icon} width={20} height={20} />
              <span className={styles.moreLabel}>{label}</span>
              <span className={styles.moreSoon}>скоро</span>
            </span>
          ) : (
            <Link href={href} className={styles.moreItem}>
              <Icon id={icon} width={20} height={20} />
              <span className={styles.moreLabel}>{label}</span>
              <Icon id={IconTypes.chevroneRight} width={16} height={16} />
            </Link>
          )}
        </li>
      ))}
      <li>
        <button
          type="button"
          className={classNames(styles.moreItem, styles.moreLogout)}
          onClick={logout}
        >
          <Icon id={IconTypes.close} width={20} height={20} />
          <span className={styles.moreLabel}>Вийти</span>
        </button>
      </li>
    </ul>
  );
};

export default Page;
