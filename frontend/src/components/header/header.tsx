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
import { MobileMenu } from '@/components/mobile-menu';
import useUserStore from '@/store/useUserStore';
import useBookingStore from '@/store/useBookingStore';
import useLoginStore from '@/store/useLoginStore';
import { Icon, IconTypes } from '@/components/icon';
import { UserMenu } from '@/components/user-menu';

const SCROLL_THRESHOLD = 60;
const SECTION_IDS = ['services', 'works', 'reviews', 'about', 'contacts'];

const Header = () => {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  // Прозора шапка з білим текстом розрахована на темне відео героя. На решті
  // сторінок тло світле, і такий текст зникав би — там вона одразу суцільна.
  const isSolid = pathname !== '/' || isScrolled;
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const { user, isReady } = useUserStore();
  const openBooking = useBookingStore((state) => state.openBooking);

  const openLogin = useLoginStore((state) => state.openLogin);
  const handleOpenModal = () => openLogin();

  useEffect(() => {
    const sentinel = document.getElementById('header-scroll-sentinel');
    if (!sentinel) return;

    const observer = new IntersectionObserver(([entry]) => setIsScrolled(!entry.isIntersecting), {
      rootMargin: `${SCROLL_THRESHOLD}px 0px 0px 0px`,
    });
    observer.observe(sentinel);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const observedIds = new Set<string>();

    const intersectionObserver = new IntersectionObserver(
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

    const observeAvailableSections = () => {
      SECTION_IDS.forEach((id) => {
        if (observedIds.has(id)) return;

        const el = document.getElementById(id);
        if (el) {
          intersectionObserver.observe(el);
          observedIds.add(id);
        }
      });

      if (observedIds.size === SECTION_IDS.length) {
        mutationObserver.disconnect();
      }
    };

    // Some sections (e.g. reviews) mount asynchronously after a data fetch,
    // so they may not exist yet on first render — watch the DOM for them.
    const mutationObserver = new MutationObserver(observeAvailableSections);
    mutationObserver.observe(document.body, { childList: true, subtree: true });

    observeAvailableSections();

    return () => {
      intersectionObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, [pathname]);

  return (
    <header className={classNames(styles.wrapper, isSolid && styles.scrolled)}>
      <Image
        className={classNames(styles.logo, isSolid && styles.logoScrolled)}
        src={'/big-logo.svg'}
        alt="Bastidot Grooming"
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
          onClick={() => openBooking()}
        />
        {!isReady ? (
          // Доки збережена сесія не відновилась, не вгадуємо: і «Увійти», і
          // аватарка були б здогадкою. Тримаємо місце того самого розміру —
          // інакше шапка смикається, коли зʼявиться справжній елемент.
          <div
            className={classNames(styles.authPlaceholder, styles.desktopOnly)}
            aria-hidden="true"
          />
        ) : user ? (
          <UserMenu user={user} className={styles.desktopOnly} />
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
      <LoginModal />
      <MobileMenu
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        activeSection={activeSection}
        onOpenLogin={handleOpenModal}
        onOpenBooking={() => openBooking()}
      />
    </header>
  );
};

export default Header;
