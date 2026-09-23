import { IconTypes } from '@/components/icon';
import { SOCIAL } from '@/utils/site';

type LinkProps = {
  href: string;
  label: string;
  anchorId?: string;
};

export const links: LinkProps[] = [
  { href: '/', label: 'Головна' },
  { href: '/#services', label: 'Послуги', anchorId: 'services' },
  { href: '/#works', label: 'Наші роботи', anchorId: 'works' },
  // { href: '/#academy', label: 'Курси', anchorId: 'academy' },
  { href: '/#reviews', label: 'Відгуки', anchorId: 'reviews' },
  { href: '/#about', label: 'Про нас', anchorId: 'about' },
  { href: '/#contacts', label: 'Контакти', anchorId: 'contacts' },
];

export const footerSocials = [
  {
    href: SOCIAL.facebook,
    icon: IconTypes.facebook,
    label: 'Bastidot у Facebook',
  },
  {
    href: SOCIAL.instagram,
    icon: IconTypes.instagram,
    label: 'Bastidot в Instagram',
  },
  {
    href: SOCIAL.youtube,
    icon: IconTypes.youtube,
    label: 'Bastidot на YouTube',
  },
  {
    href: SOCIAL.tiktok,
    icon: IconTypes.tiktok,
    label: 'Bastidot у TikTok',
  },
];

export const offers = [
  { id: 1, text: 'Стрижку та тримінг' },
  { id: 2, text: 'Догляд за кігтями, вухами, лапками та шерстю' },
  { id: 3, text: 'Гігієнічний комплекс' },
  { id: 4, text: 'Вичісування котів' },
  { id: 5, text: 'Експрес-линька' },
];

export const contactBlockSocials = [
  {
    href: SOCIAL.instagram,
    icon: IconTypes.instagram,
    label: 'Bastidot в Instagram',
  },
  {
    href: SOCIAL.telegram,
    icon: IconTypes.telegram,
    label: 'Bastidot у Telegram',
  },
  {
    href: SOCIAL.youtube,
    icon: IconTypes.youtube,
    label: 'Bastidot на YouTube',
  },
  {
    href: SOCIAL.tiktok,
    icon: IconTypes.tiktok,
    label: 'Bastidot у TikTok',
  },
];
