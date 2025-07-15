'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import classNames from 'classnames';

import { Button } from '@/components/button';
import { links } from '@/utils/const';

import styles from './header.module.scss';

const Header = () => {
  const pathname = usePathname();

  const handleScroll = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
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
