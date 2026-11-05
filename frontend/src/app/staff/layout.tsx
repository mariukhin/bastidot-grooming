import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { RequireAuth } from '@/components/require-auth';
import StaffShell from './staff-shell';

export const metadata: Metadata = {
  title: 'Кабінет персоналу',
  robots: { index: false, follow: false },
};

const StaffLayout = ({ children }: { children: ReactNode }) => (
  <RequireAuth roles={['groomer', 'admin']} fallback="/account">
    <StaffShell>{children}</StaffShell>
  </RequireAuth>
);

export default StaffLayout;
