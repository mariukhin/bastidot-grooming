// store/useCounterStore.ts
import { create } from 'zustand';

// Визначаємо інтерфейс для стану
interface CounterState {
  count: number;
  increment: () => void;
  decrement: () => void;
  reset: () => void;
}

// Створюємо стор
const useCounterStore = create<CounterState>((set) => ({
  count: 0, // Початкове значення лічильника
  increment: () => set((state) => ({ count: state.count + 1 })), // Функція для збільшення
  decrement: () => set((state) => ({ count: state.count - 1 })), // Функція для зменшення
  reset: () => set({ count: 0 }), // Функція для скидання
}));

export default useCounterStore;
