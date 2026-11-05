import type { Role } from '@/store/useUserStore';

/**
 * Куди веде «Профіль» для цієї ролі: персонал має свій кабінет, і посилати
 * його в клієнтський — означає показати порожню сторінку чужого розділу.
 */
export const cabinetPath = (role: Role | undefined): string =>
  role === 'groomer' || role === 'admin' ? '/staff' : '/account';

export const cabinetLabel = (role: Role | undefined): string =>
  role === 'groomer' || role === 'admin' ? 'Кабінет персоналу' : 'Особистий кабінет';
