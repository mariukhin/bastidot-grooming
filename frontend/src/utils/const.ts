import { IconTypes } from '@/components/icon';

type LinkProps = {
  href: string;
  label: string;
  anchorId?: string;
};

export const links: LinkProps[] = [
  { href: '/', label: 'Головна' },
  { href: '/#services', label: 'Послуги', anchorId: 'services' },
  { href: '/#academy', label: 'Курси', anchorId: 'academy' },
  { href: '/#reviews', label: 'Відгуки', anchorId: 'reviews' },
  { href: '/#about', label: 'Про нас', anchorId: 'about' },
  { href: '/contacts', label: 'Контакти' },
];

export const footerSocials = [
  {
    href: 'https://www.facebook.com/profile.php?id=61573034533317',
    icon: IconTypes.facebook,
  },
  {
    href: 'https://www.instagram.com/basti.dot',
    icon: IconTypes.instagram,
  },
  {
    href: 'https://www.youtube.com/@BastidotGrooming',
    icon: IconTypes.youtube,
  },
  {
    href: 'https://www.tiktok.com/@bastidot.grooming',
    icon: IconTypes.tiktok,
  },
];
