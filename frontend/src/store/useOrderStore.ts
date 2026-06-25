import { create } from 'zustand';
import { createOrder } from '@/api/order';
import { OrderRequest, OrderResponse } from '@/components/booking-modal/types';

interface OrderState {
  order: OrderResponse | null;
  createOrder: (payload: OrderRequest) => Promise<OrderResponse | null>;
}

const useOrderStore = create<OrderState>((set) => ({
  order: null,
  createOrder: async (payload) => {
    const data = await createOrder(payload);
    set({ order: data ?? null });
    return data ?? null;
  },
}));

export default useOrderStore;
