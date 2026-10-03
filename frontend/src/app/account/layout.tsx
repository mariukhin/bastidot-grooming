import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { RequireAuth } from '@/components/require-auth';
import AccountShell from './account-shell';

export const metadata: Metadata = {
  title: 'Особистий кабінет',
  // Кабінет не має бути в пошуку: він порожній для всіх, крім власника.
  robots: { index: false, follow: false },
};

const AccountLayout = ({ children }: { children: ReactNode }) => (
  <RequireAuth>
    <AccountShell>{children}</AccountShell>
  </RequireAuth>
);

export default AccountLayout;
