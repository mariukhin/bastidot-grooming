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

export type AdminEventType = 'unassigned' | 'unconfirmed' | 'cancelled' | 'reminder' | 'reschedule';

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
  /** Для reschedule: через що грумер не працює в цей час. */
  exceptionType?: ExceptionType;
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
  exceptionType?: ExceptionType;
};

export type ExceptionType = 'vacation' | 'sick' | 'day_off' | 'custom_hours';

export const EXCEPTION_LABEL: Record<ExceptionType, string> = {
  vacation: 'Відпустка',
  sick: 'Лікарняний',
  day_off: 'Вихідний',
  custom_hours: 'Інші години',
};

export type WeeklyRule = { weekday: number; from: string; to: string };

export type ScheduleException = {
  id: string;
  type: ExceptionType;
  dateFrom: string;
  dateTo: string;
  from?: string;
  to?: string;
  note?: string;
  changedBy: string | null;
  changedAt: string | null;
  /** Імʼя того, хто додав виняток (адмін чи сам грумер). */
  changedByName?: string | null;
  /** Скільки майбутніх записів опинились поза графіком через цей виняток. */
  affectedOrders?: number;
};

/** Збережений шаблон, що діє з найближчого понеділка. */
export type PendingWeekly = { effectiveFrom: string; weekly: WeeklyRule[] };

export type GroomerScheduleDetail = {
  groomerId: string;
  name: string;
  onlineBooking: boolean;
  weekly: WeeklyRule[];
  pendingWeekly: PendingWeekly | null;
  exceptions: ScheduleException[];
};

export type ExceptionInput = Pick<ScheduleException, 'type' | 'dateFrom' | 'dateTo'> &
  Partial<Pick<ScheduleException, 'from' | 'to' | 'note'>>;

const NETWORK = "Немає зв'язку з сервером. Перевірте інтернет";
const FALLBACK = 'Не вдалося завантажити дані';

async function send<T>(
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
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
      const body = (data ?? {}) as { error?: string; code?: string } & Record<string, unknown>;
      return { ok: false, message: body.error ?? FALLBACK, code: body.code, details: body };
    }
    return { ok: true, data: data as T };
  } catch {
    return { ok: false, message: NETWORK };
  }
}

const get = <T>(path: string) => send<T>('GET', path);

export const fetchGroomerDay = (date: string) =>
  get<{ date: string; orders: StaffOrder[] }>(`/groomer/orders?date=${date}`);

export const fetchAdminDay = (date: string, groomerId?: string) =>
  get<{ date: string; orders: StaffOrder[] }>(
    `/admin/orders?date=${date}${groomerId ? `&groomerId=${groomerId}` : ''}`
  );

export const fetchAdminStats = (date: string) => get<AdminStats>(`/admin/stats?date=${date}`);

export const fetchDaySchedule = (date: string) =>
  get<{ date: string; groomers: DaySchedule[] }>(`/schedule?date=${date}`);

export const searchClients = (query: string) =>
  get<ClientSearchResult[]>(`/admin/clients/search?q=${encodeURIComponent(query)}`);

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

/** groomerId — «me» для власного графіка грумера. */
export const fetchGroomerSchedule = (groomerId: string) =>
  get<GroomerScheduleDetail>(`/schedule/${groomerId}`);

/** affectedOrders — скільки вже існуючих записів опинились поза графіком. */
export const saveWeeklySchedule = (groomerId: string, weekly: WeeklyRule[]) =>
  send<{ ok: true; weekly: WeeklyRule[]; affectedOrders: number; effectiveFrom: string }>(
    'PUT',
    `/schedule/${groomerId}`,
    { weekly }
  );

export const addScheduleException = (groomerId: string, input: ExceptionInput) =>
  send<{ ok: true; exception: ScheduleException; affectedOrders: number }>(
    'POST',
    `/schedule/${groomerId}/exceptions`,
    input
  );

export const removeScheduleException = (groomerId: string, id: string) =>
  send<{ ok: true; affectedOrders: number }>('DELETE', `/schedule/${groomerId}/exceptions/${id}`);

export const setGroomerOnlineBooking = (groomerId: string, onlineBooking: boolean) =>
  send<{ ok: true; onlineBooking: boolean }>('PUT', `/schedule/${groomerId}/online-booking`, {
    onlineBooking,
  });

/* ---------- клієнти (адмін) ---------- */

export type ClientSegment = 'regular' | 'new' | 'lapsed' | 'no_visits';

export const SEGMENT_LABEL: Record<ClientSegment, string> = {
  regular: 'Постійні',
  new: 'Нові',
  lapsed: 'Давно не були',
  no_visits: 'Без візитів',
};

export type AdminClient = {
  id: string;
  name: string;
  phone: string;
  pets: { id: string; name: string }[];
  visitsCount: number;
  spent: number;
  firstVisitAt: string | null;
  lastVisitAt: string | null;
  avgIntervalDays: number | null;
  hasOrders: boolean;
  segments: ClientSegment[];
};

export type AdminClientsPage = {
  items: AdminClient[];
  page: number;
  pageSize: number;
  total: number;
  counts: { all: number } & Record<ClientSegment, number>;
};

export type ClientPetTrait = {
  key: string;
  label: string;
  minLabel: string;
  maxLabel: string;
  value: number;
};

export type ClientCard = {
  id: string;
  name: string;
  lastName: string;
  phone: string;
  email: string;
  doNotContact: boolean;
  source: string;
  since: string | null;
  adminNote: string;
  segments: ClientSegment[];
  stats: {
    visitsCount: number;
    spent: number;
    firstVisitAt: string | null;
    lastVisitAt: string | null;
    avgIntervalDays: number | null;
    hasOrders: boolean;
    hasUpcoming: boolean;
  };
  rebookHint: { text: string; dueAt: string } | null;
  nextVisit: { id: string; scheduledAt: string; groomer: { id: string; name: string } } | null;
  pets: {
    id: string;
    name: string;
    breedId: string | null;
    breedName: string | null;
    breedCustom: string | null;
    species: string;
    weight: number;
    birthDate: string | null;
    photoUrl: string | null;
    photoPreviewUrl: string | null;
    wishes: string;
    traits: ClientPetTrait[];
  }[];
  visits: {
    id: string;
    scheduledAt: string;
    status: StaffOrder['status'];
    petName: string | null;
    groomer: { id: string; name: string };
    services: string[];
    total: number;
  }[];
};

export type ClientInput = {
  name: string;
  phone: string;
  lastName?: string;
  email?: string;
  adminNote?: string;
};

export const fetchAdminClients = (params: {
  q?: string;
  segment?: ClientSegment | null;
  page?: number;
}) => {
  const search = new URLSearchParams();
  if (params.q) search.set('q', params.q);
  if (params.segment) search.set('segment', params.segment);
  if (params.page && params.page > 1) search.set('page', String(params.page));
  const query = search.toString();
  return get<AdminClientsPage>(`/admin/clients${query ? `?${query}` : ''}`);
};

export const fetchClientCard = (id: string) => get<ClientCard>(`/admin/clients/${id}`);

export const createAdminClient = (input: ClientInput) =>
  send<ClientCard>('POST', '/admin/clients', input);

export const updateAdminClient = (id: string, patch: Partial<ClientInput>) =>
  send<ClientCard>('PATCH', `/admin/clients/${id}`, patch);
