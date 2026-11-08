import { API_URL } from './config';
import useUserStore from '@/store/useUserStore';
import type { AccountResult } from './account';

export type StaffOrder = {
  id: string;
  scheduledAt: string;
  durationMinutes: number;
  status: 'pending' | 'came' | 'completed' | 'cancelled' | 'no_show';
  comment: string;
  groomerNote?: string;
  services: string[] | { id: string; name: string; price: number }[];
  ownerName?: string;
  client?: { name: string; phone: string };
  groomer?: { id: string; name: string } | null;
  total?: number;
  pet: {
    name: string;
    breedName: string | null;
    wishes?: string;
    traits?: PetTraitValue[];
  } | null;
};

export type PetTraitValue = {
  key: string;
  label: string;
  minLabel: string;
  maxLabel: string;
  /** Шкала 1..10, як у картці улюбленця. */
  value: number;
};

export type GroomerOrderDetail = {
  id: string;
  scheduledAt: string;
  durationMinutes: number;
  status: StaffOrder['status'];
  comment: string;
  groomerNote: string;
  services: string[];
  ownerName: string;
  pet: {
    name: string;
    breedName: string | null;
    weight: number | null;
    ageMonths: number | null;
    wishes: string;
    traits: PetTraitValue[];
  } | null;
  history: {
    scheduledAt: string;
    status: StaffOrder['status'];
    comment: string;
    groomerNote: string;
  }[];
};

export type DaySchedule = {
  groomerId: string;
  name: string;
  intervals: { from: string; to: string }[];
  source: 'weekly' | 'exception' | 'default';
};

const NETWORK = "Немає зв'язку з сервером. Перевірте інтернет";
const FALLBACK = 'Не вдалося завантажити дані';

async function get<T>(path: string): Promise<AccountResult<T>> {
  const { accessToken } = useUserStore.getState();
  if (!accessToken) return { ok: false, message: FALLBACK };

  try {
    const response = await fetch(`${API_URL}/staff${path}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data: unknown = await response.json().catch(() => null);

    if (!response.ok) {
      const message = (data as { error?: string } | null)?.error;
      return { ok: false, message: message ?? FALLBACK };
    }
    return { ok: true, data: data as T };
  } catch {
    return { ok: false, message: NETWORK };
  }
}

export const fetchGroomerDay = (date: string) =>
  get<{ date: string; orders: StaffOrder[] }>(`/groomer/orders?date=${date}`);

export const fetchAdminDay = (date: string) =>
  get<{ date: string; orders: StaffOrder[] }>(`/admin/orders?date=${date}`);

export const fetchDaySchedule = (date: string) =>
  get<{ date: string; groomers: DaySchedule[] }>(`/schedule?date=${date}`);

export const fetchGroomerOrder = (id: string) => get<GroomerOrderDetail>(`/groomer/orders/${id}`);

async function patch<T>(path: string, body: unknown): Promise<AccountResult<T>> {
  const { accessToken } = useUserStore.getState();
  if (!accessToken) return { ok: false, message: FALLBACK };

  try {
    const response = await fetch(`${API_URL}/staff${path}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
    });
    const data: unknown = await response.json().catch(() => null);

    if (!response.ok) {
      const message = (data as { error?: string } | null)?.error;
      return { ok: false, message: message ?? FALLBACK };
    }
    return { ok: true, data: data as T };
  } catch {
    return { ok: false, message: NETWORK };
  }
}

export const setGroomerStatus = (id: string, status: 'came' | 'completed' | 'no_show') =>
  patch<GroomerOrderDetail>(`/groomer/orders/${id}/status`, { status });

export const saveGroomerNote = (id: string, groomerNote: string) =>
  patch<GroomerOrderDetail>(`/groomer/orders/${id}/note`, { groomerNote });
