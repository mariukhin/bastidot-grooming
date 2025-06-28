'use client';

import {
  LogoFooter,
  MainLogo,
  FacebookLogo,
  YouTubeLogo,
  TiktokLogo,
  InstagramLogo,
} from '@/components/logo';
import { links } from '@/utils/const';
import Link from 'next/link';

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
          <div className={styles.socialContainer}>
            <a
              href={'https://www.facebook.com/profile.php?id=61573034533317'}
              target="_blank"
              rel="noopener noreferrer"
            >
              <FacebookLogo />
            </a>
            <a
              href={'https://www.instagram.com/basti.dot'}
              target="_blank"
              rel="noopener noreferrer"
            >
              <InstagramLogo />
            </a>
            <a
              href={'https://www.youtube.com/@BastidotGrooming'}
              target="_blank"
              rel="noopener noreferrer"
            >
              <YouTubeLogo />
            </a>
            <a
              href={'https://www.tiktok.com/@bastidot.grooming'}
              target="_blank"
              rel="noopener noreferrer"
            >
              <TiktokLogo />
            </a>
          </div>
        </div>
        <div className={styles.logoContainer}>
          <MainLogo className={styles.mainLogo} />
          <LogoFooter className={styles.footerLogo} />
          <span className={styles.footerText}>© 2025 Bastidot. All rights reserved.</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
