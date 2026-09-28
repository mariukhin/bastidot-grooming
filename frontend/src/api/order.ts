import { OrderActionResult, OrderRequest } from '@/components/booking-modal/types';
import { API_URL } from './config';

export async function createOrder(payload: OrderRequest) {
  try {
    const response = await fetch(`${API_URL}/order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (data) {
      return data;
    }
  } catch (err) {
    console.error(err);
  }
}

// Бекенд відповідає осмисленими кодами (too-late, slot-taken…), тож помилку
// не ковтаємо, а піднімаємо нагору — її треба показати клієнту дослівно.
async function orderAction(path: string, body: unknown): Promise<OrderActionResult> {
  try {
    const response = await fetch(`${API_URL}/order/${path}`, {
      method: path.endsWith('/cancel') ? 'POST' : 'PATCH',
      headers: { 'Content-Type': 'application/json' },
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

export const cancelOrder = (orderId: string, token: string): Promise<OrderActionResult> =>
  orderAction(`${orderId}/cancel`, { token });

export const rescheduleOrder = (
  orderId: string,
  token: string,
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
