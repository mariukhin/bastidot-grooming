import { OrderActionResult, OrderRequest, OrderResponse } from '@/components/booking-modal/types';
import { API_URL } from './config';
import useUserStore from '@/store/useUserStore';

export type CreateOrderResult = { ok: true; order: OrderResponse } | { ok: false; message: string };

export async function createOrder(payload: OrderRequest): Promise<CreateOrderResult> {
  try {
    // Токен необовʼязковий: запис працює і для незалогінених. Коли він є,
    // бекенд зводить акаунт із карткою клієнта, яку створює цей запис.
    const { accessToken } = useUserStore.getState();

    const response = await fetch(`${API_URL}/order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      return {
        ok: false,
        message: data?.error ?? 'Не вдалося створити запис. Спробуйте ще раз',
      };
    }

    return { ok: true, order: data as OrderResponse };
  } catch {
    return { ok: false, message: "Немає зв'язку з сервером. Спробуйте ще раз" };
  }
}

// Бекенд відповідає осмисленими кодами (too-late, slot-taken…), тож помилку
// не ковтаємо, а піднімаємо нагору — її треба показати клієнту дослівно.
async function orderAction(path: string, body: unknown): Promise<OrderActionResult> {
  try {
    // Заголовок додаємо, коли є сесія: тоді право на запис підтверджує акаунт.
    // Для незалогіненого лишається cancelToken у тілі — обидва шляхи рівноправні.
    const { accessToken } = useUserStore.getState();

    const response = await fetch(`${API_URL}/order/${path}`, {
      method: path.endsWith('/cancel') ? 'POST' : 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      return { ok: false, message: data?.error ?? 'Не вдалося змінити запис', code: data?.code };
    }
    return { ok: true, order: data };
  } catch (err) {
    console.error(err);
    return { ok: false, message: "Немає зв'язку з сервером. Спробуйте ще раз" };
  }
}

export const cancelOrder = (orderId: string, token = ''): Promise<OrderActionResult> =>
  orderAction(`${orderId}/cancel`, { token });

export const rescheduleOrder = (
  orderId: string,
  token: string | '',
  scheduledAt: string,
  durationMinutes: number
): Promise<OrderActionResult> =>
  orderAction(`${orderId}/schedule`, { token, scheduledAt, durationMinutes });

export async function getBusySlots(groomerId: string, from: string, to: string) {
  try {
    const response = await fetch(
      `${API_URL}/order/busy-slots?groomerId=${groomerId}&from=${from}&to=${to}`
    );

    const data = await response.json();

    if (response.ok && Array.isArray(data)) {
      return data;
    }

    console.error('getBusySlots failed:', data);
  } catch (err) {
    console.error(err);
  }
}
