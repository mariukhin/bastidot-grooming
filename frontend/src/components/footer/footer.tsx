'use client';

import Image from 'next/image';
import Link from 'next/link';

import { Icon } from '@/components/icon';
import { links, footerSocials } from '@/utils/const';

import styles from './footer.module.scss';

const Footer = () => {
  return (
    <footer className={styles.container}>
      <div className={styles.wrapper}>
        <div className={styles.linksContainer}>
          <nav className={styles.navbar}>
            <ul className={styles.navbarContainer}>
              {links.map(({ href, label }) => (
                <li key={label} className={styles.linkText}>
                  <Link href={href}>{label}</Link>
                </li>
              ))}
            </ul>
          </nav>
          <ul className={styles.socialContainer}>
            {footerSocials.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  className={styles.socialLink}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Icon id={item.icon} color={'var(--color-woodsmoke)'} />
                </a>
              </li>
            ))}
          </ul>
        </div>
        <div className={styles.logoContainer}>
          <Image
            className={styles.bigLogo}
            src={'/big-logo.svg'}
            alt="Logo"
            width={169}
            height={37}
            priority
          />
          <Image
            className={styles.smallLogo}
            src={'/small-logo.svg'}
            alt="Logo"
            width={75}
            height={57}
            priority
          />
          <span className={styles.footerText}>© 2025 Bastidot. All rights reserved.</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
