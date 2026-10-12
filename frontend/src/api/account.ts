import { API_URL } from './config';
import useUserStore from '@/store/useUserStore';

export type PetTraitValue = { traitKey: string; value: number };

export type AccountPet = {
  id: string;
  name: string;
  breedId: string | null;
  breedName: string | null;
  breedCustom: string | null;
  species: 'dog' | 'cat';
  weight: number;
  birthDate: string | null;
  photoUrl: string | null;
  wishes: string;
  traits: PetTraitValue[];
  createdAt: string;
};

export type PetTrait = {
  key: string;
  label: string;
  minLabel: string;
  maxLabel: string;
  order: number;
};

export type PetBody = {
  name: string;
  breedId?: string | null;
  breedCustom?: string | null;
  weight: number;
  birthDate?: string | null;
  wishes?: string;
  traits?: PetTraitValue[];
};

export type PetField = 'name' | 'breedId' | 'breedCustom' | 'weight' | 'birthDate' | 'traits';

export type PetMutationResult =
  { ok: true; pet: AccountPet } | { ok: false; message: string; field?: PetField };

export type VisitStatus = 'pending' | 'completed' | 'cancelled' | 'no_show';

export type AccountVisit = {
  id: string;
  scheduledAt: string;
  durationMinutes: number;
  status: VisitStatus;
  comment: string;
  pet: { id: string; name: string; photoUrl: string | null; breedName: string | null } | null;
  groomer: { id: string; name: string; photoUrl: string | null; isActive: boolean } | null;
  services: { id: string; name: string; price: number; isActive: boolean }[];
  breedId: string | null;
  total: number;
  canCancel: boolean;
  canReschedule: boolean;
};

export type OrdersPage = { items: AccountVisit[]; nextCursor: string | null };

export type AccountResult<T> = { ok: true; data: T } | { ok: false; message: string };

const NETWORK_MESSAGE = "Немає зв'язку з сервером. Перевірте інтернет";
const FALLBACK_MESSAGE = 'Не вдалося завантажити дані. Спробуйте ще раз';

async function getProtected<T>(path: string): Promise<AccountResult<T>> {
  const { accessToken } = useUserStore.getState();
  if (!accessToken) {
    return { ok: false, message: FALLBACK_MESSAGE };
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}/protected${path}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  } catch {
    return { ok: false, message: NETWORK_MESSAGE };
  }

  const data: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      data && typeof data === 'object' && typeof (data as { error?: unknown }).error === 'string'
        ? (data as { error: string }).error
        : FALLBACK_MESSAGE;
    return { ok: false, message };
  }

  return { ok: true, data: data as T };
}

export const fetchAccountPets = () => getProtected<AccountPet[]>('/pets');
export const fetchAccountOrders = (scope: 'upcoming' | 'past', cursor?: string | null) =>
  getProtected<OrdersPage>(
    `/orders?scope=${scope}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`
  );

/** Вкладка «Візити» показує і майбутні, і минулі — спершу найближчі. */
export async function fetchAccountVisits(): Promise<AccountResult<AccountVisit[]>> {
  const [upcoming, past] = await Promise.all([
    fetchAccountOrders('upcoming'),
    fetchAccountOrders('past'),
  ]);

  if (!upcoming.ok) return upcoming;
  if (!past.ok) return past;

  return { ok: true, data: [...upcoming.data.items, ...past.data.items] };
}

export type AccountProfile = {
  id: string;
  name: string;
  email: string;
  phoneNumber: string;
  phoneVerified: boolean;
  photoUrl: string;
  role: 'client' | 'groomer' | 'admin';
};

export const fetchAccountProfile = () => getProtected<AccountProfile>('/profile');

export type ProfileUpdateBody = {
  name?: string;
  email?: string;
  phoneNumber?: string;
};

export type ProfileUpdateResult =
  | { ok: true; profile: AccountProfile }
  | { ok: false; message: string; field?: 'name' | 'email' | 'phoneNumber' };

export async function updateAccountProfile(body: ProfileUpdateBody): Promise<ProfileUpdateResult> {
  const { accessToken } = useUserStore.getState();
  if (!accessToken) return { ok: false, message: FALLBACK_MESSAGE };

  let response: Response;
  try {
    response = await fetch(`${API_URL}/protected/profile`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(body),
    });
  } catch {
    return { ok: false, message: NETWORK_MESSAGE };
  }

  const data: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const d = (data ?? {}) as { error?: unknown; field?: unknown };
    return {
      ok: false,
      message: typeof d.error === 'string' ? d.error : FALLBACK_MESSAGE,
      field:
        d.field === 'name' || d.field === 'email' || d.field === 'phoneNumber'
          ? d.field
          : undefined,
    };
  }

  return { ok: true, profile: data as AccountProfile };
}

async function sendPet(
  path: string,
  method: 'POST' | 'PATCH',
  body: PetBody
): Promise<PetMutationResult> {
  const { accessToken } = useUserStore.getState();
  if (!accessToken) return { ok: false, message: FALLBACK_MESSAGE };

  let response: Response;
  try {
    response = await fetch(`${API_URL}/protected${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(body),
    });
  } catch {
    return { ok: false, message: NETWORK_MESSAGE };
  }

  const data: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const d = (data ?? {}) as { error?: unknown; field?: unknown };
    return {
      ok: false,
      message: typeof d.error === 'string' ? d.error : FALLBACK_MESSAGE,
      field: typeof d.field === 'string' ? (d.field as PetField) : undefined,
    };
  }

  return { ok: true, pet: data as AccountPet };
}

export const createPet = (body: PetBody) => sendPet('/pets', 'POST', body);
export const updatePet = (id: string, body: PetBody) => sendPet(`/pets/${id}`, 'PATCH', body);

export async function deletePet(id: string): Promise<{ ok: boolean; message?: string }> {
  const { accessToken } = useUserStore.getState();
  if (!accessToken) return { ok: false, message: FALLBACK_MESSAGE };

  try {
    const response = await fetch(`${API_URL}/protected/pets/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      const error = (data as { error?: unknown } | null)?.error;
      return { ok: false, message: typeof error === 'string' ? error : FALLBACK_MESSAGE };
    }
    return { ok: true };
  } catch {
    return { ok: false, message: NETWORK_MESSAGE };
  }
}

async function getPublic<T>(path: string): Promise<T | null> {
  try {
    const response = await fetch(`${API_URL}${path}`);
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export const fetchPetTraits = () => getPublic<PetTrait[]>('/pet-traits');

export type BreedOption = { id: string; name: string };

export const searchBreeds = (query: string) =>
  getPublic<BreedOption[]>(`/breed?q=${encodeURIComponent(query)}`);

export const fetchAllBreeds = () => getPublic<BreedOption[]>('/breed');
