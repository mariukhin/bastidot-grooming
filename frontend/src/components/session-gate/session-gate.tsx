'use client';

import { useEffect } from 'react';

import { refreshSession } from '@/api/auth';
import useUserStore from '@/store/useUserStore';
import { hydrateProfile } from '@/utils/session';

const SessionGate = () => {
  useEffect(() => {
    const store = useUserStore.getState();

    // setReady — одразу, НЕ після відповіді сервера. Інакше шапка цілу секунду
    // чекає на /public/refresh і встигає показати «Увійти» вже залогіненому.
    // Збереженій сесії довіряємо наперед, а звіряємо її у фоні.
    store.setReady();

    if (!store.refreshToken) {
      return;
    }

    let cancelled = false;

    void refreshSession(store.refreshToken).then((result) => {
      if (cancelled) return;

      const current = useUserStore.getState();
      if (result.ok) {
        // Роль беремо з відповіді: права могли змінитись, доки вкладка була закрита.
        current.setSession(
          current.user ? { ...current.user, role: result.tokens.role } : null,
          result.tokens.accessToken,
          result.tokens.refreshToken
        );
        void hydrateProfile();
      } else {
        current.logout();
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
};

export default SessionGate;
