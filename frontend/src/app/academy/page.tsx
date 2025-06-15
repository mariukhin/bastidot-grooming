'use client';

import styles from './page.module.scss';
import useCounterStore from '../../store/useCounterStore';

const Academy = () => {
  // Використовуємо кастомний хук для доступу до стану та дій
  // Ви можете вибрати, які саме частини стану вам потрібні
  const { count, increment, decrement, reset } = useCounterStore();

  return (
    <div
      className={styles.wrapper}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        fontFamily: 'sans-serif',
      }}
    >
      <h1>Academy</h1>
      <p style={{ fontSize: '3rem', margin: '20px 0' }}>Count: {count}</p>
      <div style={{ display: 'flex', gap: '10px' }}>
        <button
          onClick={increment}
          style={{ padding: '10px 20px', fontSize: '1rem', cursor: 'pointer' }}
        >
          Increment
        </button>
        <button
          onClick={decrement}
          style={{ padding: '10px 20px', fontSize: '1rem', cursor: 'pointer' }}
        >
          Decrement
        </button>
        <button
          onClick={reset}
          style={{ padding: '10px 20px', fontSize: '1rem', cursor: 'pointer' }}
        >
          Reset
        </button>
      </div>
    </div>
  );
};

export default Academy;
