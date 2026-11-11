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
  /** Підтвердження салону. Є лише у відповіді адміна. */
  confirmedAt?: string | null;
  /** Звідки прийшов клієнт: поле картки в CRM. */
  source?: string;
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

export type AdminStats = {
  date: string;
  total: number;
  cancelled: number;
  unconfirmed: number;
  bookedMinutes: number;
  workingMinutes: number;
  /** Частка зайнятого робочого часу, 0–1. */
  utilization: number;
  expectedRevenue: number;
};

export type AdminEventType = 'unassigned' | 'unconfirmed' | 'cancelled' | 'reminder';

export type AdminEvent = {
  id: string;
  type: AdminEventType;
  action: 'assign' | 'confirm' | 'remind' | null;
  orderId: string;
  scheduledAt: string;
  durationMinutes: number;
  client: { name: string; phone: string };
  petName: string | null;
  groomer: { id: string; name: string } | null;
  /** Вільний на цей час грумер — кого підставить кнопка «Призначити». */
  suggestedGroomer: { id: string; name: string } | null;
};

export const ORDER_SOURCES = ['Телефон', 'Instagram', 'Прийшли самі'] as const;
export type OrderSource = (typeof ORDER_SOURCES)[number];

export type ClientSearchResult = {
  id: string;
  name: string;
  phone: string;
  visitsCount: number;
  pets: { id: string; name: string; breedId: string | null; breedName: string | null }[];
};

export type AdminOrderInput = {
  clientId?: string;
  clientName?: string;
  clientPhone?: string;
  petId?: string;
  petName?: string;
  petBreedId?: string;
  groomerId: string;
  scheduledAt: string;
  durationMinutes: number;
  serviceIds: string[];
  comment?: string;
  source: OrderSource;
};

export type DaySchedule = {
  groomerId: string;
  name: string;
  intervals: { from: string; to: string }[];
  source: 'weekly' | 'exception' | 'default';
};

const NETWORK = "Немає зв'язку з сервером. Перевірте інтернет";
const FALLBACK = 'Не вдалося завантажити дані';

async function send<T>(
  method: 'GET' | 'POST' | 'PATCH',
  path: string,
  body?: unknown
): Promise<AccountResult<T>> {
  const { accessToken } = useUserStore.getState();
  if (!accessToken) return { ok: false, message: FALLBACK };

  try {
    const response = await fetch(`${API_URL}/staff${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
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

const get = <T>(path: string) => send<T>('GET', path);

export const fetchGroomerDay = (date: string) =>
  get<{ date: string; orders: StaffOrder[] }>(`/groomer/orders?date=${date}`);

export const fetchAdminDay = (date: string) =>
  get<{ date: string; orders: StaffOrder[] }>(`/admin/orders?date=${date}`);

export const fetchAdminStats = (date: string) => get<AdminStats>(`/admin/stats?date=${date}`);

export const fetchDaySchedule = (date: string) =>
  get<{ date: string; groomers: DaySchedule[] }>(`/schedule?date=${date}`);

export const searchClients = (query: string) =>
  get<ClientSearchResult[]>(`/admin/clients?q=${encodeURIComponent(query)}`);

export const createAdminOrder = (input: AdminOrderInput) =>
  send<{ id: string }>('POST', '/admin/orders', input);

export const fetchAdminEvents = () => get<{ count: number; events: AdminEvent[] }>('/admin/events');

export const fetchGroomerOrder = (id: string) => get<GroomerOrderDetail>(`/groomer/orders/${id}`);

export const setGroomerStatus = (id: string, status: 'came' | 'completed' | 'no_show') =>
  send<GroomerOrderDetail>('PATCH', `/groomer/orders/${id}/status`, { status });

export const saveGroomerNote = (id: string, groomerNote: string) =>
  send<GroomerOrderDetail>('PATCH', `/groomer/orders/${id}/note`, { groomerNote });

export const confirmAdminOrder = (id: string) =>
  send<StaffOrder>('POST', `/admin/orders/${id}/confirm`);

export const cancelAdminOrder = (id: string) =>
  send<StaffOrder>('POST', `/admin/orders/${id}/cancel`);

export const rescheduleAdminOrder = (id: string, scheduledAt: string) =>
  send<StaffOrder>('PATCH', `/admin/orders/${id}/schedule`, { scheduledAt });

export const remindAdminOrder = (id: string) =>
  send<{ remindedAt: string }>('POST', `/admin/orders/${id}/remind`);

export const reassignAdminOrder = (id: string, groomerId: string) =>
  send<StaffOrder>('PATCH', `/admin/orders/${id}/groomer`, { groomerId });
