import { API_URL } from './config';
import useUserStore from '@/store/useUserStore';

export type AccountPet = {
  id: string;
  name: string;
  age: number;
  weight: number;
  photoUrl: string;
  breedName: string | null;
  comment: string;
};

export type VisitStatus = 'pending' | 'completed' | 'cancelled' | 'no_show';

export type AccountVisit = {
  id: string;
  scheduledAt: string;
  durationMinutes: number;
  status: VisitStatus;
  groomerName: string | null;
  serviceNames: string[];
  price: number | null;
};

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
export const fetchAccountVisits = () => getProtected<AccountVisit[]>('/visits');

export type AccountProfile = {
  id: string;
  name: string;
  email: string;
  phoneNumber: string;
  photoUrl: string;
  role: 'client' | 'groomer' | 'admin';
};

export const fetchAccountProfile = () => getProtected<AccountProfile>('/profile');
