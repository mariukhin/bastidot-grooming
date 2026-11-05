import { IconTypes } from '@/components/icon';
import type { Role } from '@/store/useUserStore';

export type StaffTab = {
  href: string;
  label: string;
  icon: IconTypes;
};

const GROOMER_TABS: StaffTab[] = [
  { href: '/staff', label: 'Розклад', icon: IconTypes.calendarCheck },
  { href: '/staff/history', label: 'Історія', icon: IconTypes.clock },
  { href: '/staff/profile', label: 'Профіль', icon: IconTypes.userCircle },
];

const ADMIN_TABS: StaffTab[] = [
  { href: '/staff', label: 'Розклад', icon: IconTypes.calendarCheck },
  { href: '/staff/clients', label: 'Клієнти', icon: IconTypes.userCircle },
  { href: '/staff/events', label: 'Події', icon: IconTypes.info },
  { href: '/staff/more', label: 'Ще', icon: IconTypes.hamburger },
];

export function tabsFor(role: Role): StaffTab[] {
  return role === 'admin' ? ADMIN_TABS : GROOMER_TABS;
}

export function scheduleTitle(role: Role): string {
  return role === 'admin' ? 'Розклад салону' : 'Мій розклад';
}

export const ROLE_LABEL: Record<Role, string> = {
  admin: 'Адміністратор',
  groomer: 'Грумер',
  client: 'Клієнт',
};

/** Центральна кнопка мобільного меню адміна. */
export const ADMIN_ACTION = { label: 'Новий запис', icon: IconTypes.calendarAdd };
