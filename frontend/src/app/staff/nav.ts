import { IconTypes } from '@/components/icon';
import type { Role } from '@/store/useUserStore';

export type StaffTab = {
  href: string;
  label: string;
  icon: IconTypes;
};

/** Вкладки десктопа: їх більше, ніж поміщається в нижнє меню телефона. */
const GROOMER_TABS: StaffTab[] = [
  { href: '/staff', label: 'Мій розклад', icon: IconTypes.calendarCheck },
  { href: '/staff/history', label: 'Історія візитів', icon: IconTypes.clock },
  { href: '/staff/profile', label: 'Профіль', icon: IconTypes.userCircle },
];

const ADMIN_TABS: StaffTab[] = [
  { href: '/staff', label: 'Розклад', icon: IconTypes.calendarCheck },
  { href: '/staff/orders', label: 'Усі записи', icon: IconTypes.clock },
  { href: '/staff/clients', label: 'Клієнти й улюбленці', icon: IconTypes.userCircle },
  { href: '/staff/groomers', label: 'Грумери та графік', icon: IconTypes.heart },
  { href: '/staff/services', label: 'Послуги й ціни', icon: IconTypes.money },
  { href: '/staff/reports', label: 'Звіти', icon: IconTypes.info },
];

/** Нижнє меню телефона: лише найчастіше потрібне й короткими словами. */
const GROOMER_NAV: StaffTab[] = [
  { href: '/staff', label: 'Розклад', icon: IconTypes.calendarCheck },
  { href: '/staff/history', label: 'Історія', icon: IconTypes.clock },
  { href: '/staff/profile', label: 'Профіль', icon: IconTypes.userCircle },
];

const ADMIN_NAV: StaffTab[] = [
  { href: '/staff', label: 'Розклад', icon: IconTypes.calendarCheck },
  { href: '/staff/clients', label: 'Клієнти', icon: IconTypes.userCircle },
  { href: '/staff/events', label: 'Події', icon: IconTypes.info },
  { href: '/staff/more', label: 'Ще', icon: IconTypes.hamburger },
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
