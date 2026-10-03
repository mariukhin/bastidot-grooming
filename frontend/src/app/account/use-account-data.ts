'use client';

import { useCallback, useEffect, useState } from 'react';

import type { AccountResult } from '@/api/account';

type State = 'loading' | 'ready' | 'error';

/** Один цикл «завантаження → дані або помилка» з можливістю повторити. */
export function useAccountData<T>(load: () => Promise<AccountResult<T[]>>) {
  const [state, setState] = useState<State>('loading');
  const [data, setData] = useState<T[]>([]);
  const [message, setMessage] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState('loading');

    void load().then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setData(result.data);
        setState('ready');
      } else {
        setMessage(result.message);
        setState('error');
      }
    });

    return () => {
      cancelled = true;
    };
    // load приходить як стабільне посилання на функцію модуля; перезапуск
    // робиться через attempt, щоб кнопка «спробувати ще раз» була передбачуваною.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  return { state, data, message, reload };
}
