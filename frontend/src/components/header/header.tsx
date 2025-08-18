'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import classNames from 'classnames';

import { Button } from '@/components/button';
import { links } from '@/utils/const';
import { handleScroll } from '@/utils/function';

import styles from './header.module.scss';
import { LoginModal } from '@/components/login-modal';
import useUserStore from '@/store/useUserStore';
import { Icon, IconTypes } from '@/components/icon';

const Header = () => {
  const pathname = usePathname();
  const [isLoginModal, setIsLoginModal] = useState(false);

  const { user } = useUserStore();

  const handleOpenModal = () => {
    setIsLoginModal(true);
  };

  return (
    <header className={styles.wrapper}>
      <Image src={'/big-logo.svg'} alt="Logo" width={169} height={37} priority />
      <nav className={styles.navbar}>
        <ul className={styles.navbarContainer}>
          {links.map(({ href, label, anchorId }) => (
            <li
              key={label}
              className={classNames(styles.linkText, pathname === href && styles.linkActive)}
            >
              <Link href={href} onClick={() => anchorId && handleScroll(anchorId)}>
                {label}
              </Link>
            </li>
          ))}
          <li className={classNames(styles.linkText, styles.phoneNumber)}>
            <a href="tel:+380501739178">+380 (50) 173-91-78</a>
          </li>
        </ul>
      </nav>
      <div className={styles.buttonContainer}>
        <Button type={'submit'} text={'Записатися'} />
        {user ? (
          <Icon className={styles.userButton} id={IconTypes.userCircle} />
        ) : (
          <Button
            className={styles.signInButton}
            onClick={handleOpenModal}
            type={'submit'}
            text={'Увійти'}
            variant={'secondary'}
          />
        )}
      </div>
      <LoginModal
        isOpen={isLoginModal}
        onClose={() => setIsLoginModal(false)}
        onSubmit={() => null}
      />
    </header>
  );
};

export default Header;
