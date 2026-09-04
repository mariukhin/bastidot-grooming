'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import classNames from 'classnames';

import { Button } from '@/components/button';
import { links } from '@/utils/const';
import { handleScroll, isNavLinkActive } from '@/utils/function';

import styles from './header.module.scss';
import { LoginModal } from '@/components/login-modal';
import { BookingModal } from '@/components/booking-modal';
import { MobileMenu } from '@/components/mobile-menu';
import useUserStore from '@/store/useUserStore';
import { Icon, IconTypes } from '@/components/icon';

const SCROLL_THRESHOLD = 60;
const SECTION_IDS = ['services', 'reviews', 'about', 'contacts'];

const Header = () => {
  const pathname = usePathname();
  const [isLoginModal, setIsLoginModal] = useState(false);
  const [isBookingModal, setIsBookingModal] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const { user } = useUserStore();

  const handleOpenModal = () => {
    setIsLoginModal(true);
  };

  useEffect(() => {
    let ticking = false;

    const updateScrolled = () => {
      setIsScrolled(window.scrollY > SCROLL_THRESHOLD);
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(updateScrolled);
        ticking = true;
      }
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const elements = SECTION_IDS.map((id) => document.getElementById(id)).filter(
      (el): el is HTMLElement => !!el
    );
    if (!elements.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          } else if (entry.target.id === SECTION_IDS[0] && entry.boundingClientRect.top > 0) {
            setActiveSection(null);
          }
        });
      },
      { rootMargin: '-45% 0px -50% 0px' }
    );

    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [pathname]);

  return (
    <header className={classNames(styles.wrapper, isScrolled && styles.scrolled)}>
      <Image
        className={classNames(styles.logo, isScrolled && styles.logoScrolled)}
        src={'/big-logo.svg'}
        alt="Logo"
        width={169}
        height={37}
        priority
      />
      <nav className={styles.navbar}>
        <ul className={styles.navbarContainer}>
          {links.map(({ href, label, anchorId }) => (
            <li
              key={label}
              className={classNames(
                styles.linkText,
                isNavLinkActive(href, anchorId, pathname, activeSection) && styles.linkActive
              )}
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
        <Button
          className={styles.desktopOnly}
          type={'button'}
          text={'Записатися'}
          onClick={() => setIsBookingModal(true)}
        />
        {user ? (
          <Icon
            className={classNames(styles.userButton, styles.desktopOnly)}
            id={IconTypes.userCircle}
          />
        ) : (
          <Button
            className={classNames(styles.signInButton, styles.desktopOnly)}
            onClick={handleOpenModal}
            type={'submit'}
            text={'Увійти'}
            variant={'secondary'}
          />
        )}
        <button
          type={'button'}
          className={styles.burgerButton}
          onClick={() => setIsMobileMenuOpen((prev) => !prev)}
          aria-expanded={isMobileMenuOpen}
          aria-controls="mobile-menu"
          aria-label={isMobileMenuOpen ? 'Закрити меню' : 'Відкрити меню'}
        >
          <Icon
            id={isMobileMenuOpen ? IconTypes.close : IconTypes.hamburger}
            width={24}
            height={24}
          />
        </button>
      </div>
      <LoginModal isOpen={isLoginModal} onClose={() => setIsLoginModal(false)} />
      <BookingModal isOpen={isBookingModal} onClose={() => setIsBookingModal(false)} />
      <MobileMenu
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        activeSection={activeSection}
        onOpenLogin={handleOpenModal}
        onOpenBooking={() => setIsBookingModal(true)}
      />
    </header>
  );
};

export default Header;
