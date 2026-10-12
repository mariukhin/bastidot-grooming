'use client';

import { useCallback, useEffect, useState } from 'react';

import type { AccountResult } from '@/api/account';
import useUserStore from '@/store/useUserStore';

type State = 'loading' | 'ready' | 'error';

export function useAccountData<T>(load: () => Promise<AccountResult<T[]>>) {
  const [state, setState] = useState<State>('loading');
  const [data, setData] = useState<T[]>([]);
  const [message, setMessage] = useState('');
  const [attempt, setAttempt] = useState(0);
  const phoneVerified = useUserStore((store) => store.user?.phoneVerified);

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
  }, [attempt, phoneVerified]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  return { state, data, message, reload };
}
