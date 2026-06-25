import { OrderRequest } from '@/components/booking-modal/types';

export async function createOrder(payload: OrderRequest) {
  try {
    const response = await fetch('http://localhost:8080/order', {
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
