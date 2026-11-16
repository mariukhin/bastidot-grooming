import { IconTypes } from '@/components/icon';
import type { Role } from '@/store/useUserStore';

export type StaffTab = {
  href: string;
  label: string;
  icon: IconTypes;
  /** Розділ ще не готовий: показуємо, але не пускаємо. */
  disabled?: boolean;
};

/** Вкладки десктопа: їх більше, ніж поміщається в нижнє меню телефона. */
const GROOMER_TABS: StaffTab[] = [
  { href: '/staff', label: 'Мій розклад', icon: IconTypes.calendarCheck },
  { href: '/staff/history', label: 'Історія візитів', icon: IconTypes.circleCheck },
  { href: '/staff/hours', label: 'Мій графік', icon: IconTypes.clock },
  { href: '/staff/profile', label: 'Профіль', icon: IconTypes.userCircle },
];

const ADMIN_TABS: StaffTab[] = [
  { href: '/staff', label: 'Розклад', icon: IconTypes.calendarCheck },
  { href: '/staff/orders', label: 'Усі записи', icon: IconTypes.circleCheck },
  { href: '/staff/clients', label: 'Клієнти й улюбленці', icon: IconTypes.userCircle },
  { href: '/staff/groomers', label: 'Грумери та графік', icon: IconTypes.clock },
  { href: '/staff/reports', label: 'Звіти', icon: IconTypes.info, disabled: true },
];

/** Нижнє меню телефона: лише найчастіше потрібне й короткими словами. */
const GROOMER_NAV: StaffTab[] = [
  { href: '/staff', label: 'Розклад', icon: IconTypes.calendarCheck },
  { href: '/staff/history', label: 'Історія', icon: IconTypes.circleCheck },
  { href: '/staff/hours', label: 'Графік', icon: IconTypes.clock },
  { href: '/staff/profile', label: 'Профіль', icon: IconTypes.userCircle },
];

const ADMIN_NAV: StaffTab[] = [
  { href: '/staff', label: 'Розклад', icon: IconTypes.calendarCheck },
  { href: '/staff/clients', label: 'Клієнти', icon: IconTypes.userCircle },
  { href: '/staff/events', label: 'Події', icon: IconTypes.info },
  { href: '/staff/more', label: 'Ще', icon: IconTypes.hamburger },
];

/** Екран «Ще» в мобільному меню адміна — усе, що не влізло в нижнє меню. */
export const ADMIN_MORE: StaffTab[] = [
  { href: '/staff/groomers', label: 'Графік роботи', icon: IconTypes.clock },
  { href: '/staff/orders', label: 'Усі записи', icon: IconTypes.circleCheck },
  { href: '/staff/reports', label: 'Звіти', icon: IconTypes.info, disabled: true },
  { href: '/staff/profile', label: 'Профіль', icon: IconTypes.userCircle },
];

export function tabsFor(role: Role): StaffTab[] {
  return role === 'admin' ? ADMIN_TABS : GROOMER_TABS;
}

export function navFor(role: Role): StaffTab[] {
  return role === 'admin' ? ADMIN_NAV : GROOMER_NAV;
}

export function scheduleTitle(role: Role): string {
  return role === 'admin' ? 'Розклад салону' : 'Мій розклад';
}

export const ROLE_LABEL: Record<Role, string> = {
  admin: 'адміністратор',
  groomer: 'грумер',
  client: 'клієнт',
};

/** Центральна кнопка мобільного меню адміна. */
export const ADMIN_ACTION = { label: 'Новий запис', icon: IconTypes.calendarAdd };
