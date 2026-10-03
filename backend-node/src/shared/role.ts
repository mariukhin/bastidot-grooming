import type { User } from './user.ts';

export const ROLES = ['client', 'groomer', 'admin'] as const;

export type Role = (typeof ROLES)[number];

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value);
}

/**
 * Роль виводиться з прапорців, а не зберігається окремим полем: інакше
 * isAdmin/isGroomer і role могли б розійтися, і довелося б гадати, що з них
 * правда. Порядок важливий — адмін, який водночас грумер, лишається адміном.
 */
export function getRole(user: Pick<User, 'isAdmin' | 'isGroomer'>): Role {
  if (user.isAdmin) return 'admin';
  if (user.isGroomer) return 'groomer';
  return 'client';
}
