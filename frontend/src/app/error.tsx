'use client';

import { useEffect, FC } from 'react';

type ErrorProps = {
  error: Error;
  reset: () => void;
};

const Error: FC<ErrorProps> = ({ error, reset }) => {
  useEffect(() => {
    console.error('🔥 Error boundary caught:', error);
  }, [error]);

  return (
    <div>
      <h1>💥 Щось пішло не так</h1>
      <p>{error.message}</p>
      <button onClick={reset}>Спробувати знову</button>
    </div>
  );
};

export default Error;
