import { create } from 'zustand';
import { createOrder, type CreateOrderResult } from '@/api/order';
import { OrderRequest, OrderResponse } from '@/components/booking-modal/types';

interface OrderState {
  order: OrderResponse | null;
  createOrder: (payload: OrderRequest) => Promise<CreateOrderResult>;
}

const useOrderStore = create<OrderState>((set) => ({
  order: null,
  createOrder: async (payload) => {
    const result = await createOrder(payload);
    set({ order: result.ok ? result.order : null });
    return result;
  },
}));

export default useOrderStore;
