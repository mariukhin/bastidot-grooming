'use client';

import { Button } from '@/components/button';
import useUserStore from '@/store/useUserStore';

import styles from './staff.module.scss';

const LogoutButton = () => {
  const logout = useUserStore((state) => state.logout);

  return (
    <Button
      className={styles.logout}
      type="button"
      text="Вийти"
      variant="secondary"
      size="medium"
      onClick={logout}
    />
  );
};

export default LogoutButton;
