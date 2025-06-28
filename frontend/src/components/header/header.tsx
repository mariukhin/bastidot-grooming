'use client';

import { Button } from '@/components/button';
import { MainLogo } from '@/components/logo';
import { links } from '@/utils/const';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import classNames from 'classnames';

import styles from './header.module.scss';

const Header = () => {
  const pathname = usePathname();

  return (
    <header className={styles.wrapper}>
      <MainLogo />
      <nav className={styles.navbar}>
        <ul className={styles.navbarContainer}>
          {links.map(({ href, label }) => (
            <li
              key={label}
              className={classNames(styles.linkText, pathname === href && styles.linkActive)}
            >
              <Link href={href}>{label}</Link>
            </li>
          ))}
          <li className={classNames(styles.linkText, styles.phoneNumber)}>
            <a href="tel:+380501739178">+380 (50) 173-91-78</a>
          </li>
        </ul>
      </nav>
      <div className={styles.buttonContainer}>
        <Button type={'submit'} text={'Записатися'} />
        <Button
          className={styles.signInButton}
          type={'submit'}
          text={'Увійти'}
          variant={'secondary'}
        />
      </div>
    </header>
  );
};

export default Header;
