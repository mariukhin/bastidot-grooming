import { OrderRequest } from '@/components/booking-modal/types';

export async function createOrder(payload: OrderRequest) {
  try {
    const response = await fetch('http://localhost:8081/order', {
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

export async function getBusySlots(groomerId: string, from: string, to: string) {
  try {
    const response = await fetch(
      `http://localhost:8081/order/busy-slots?groomerId=${groomerId}&from=${from}&to=${to}`
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
