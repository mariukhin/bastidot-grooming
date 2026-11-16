'use client';

import { useEffect, useState } from 'react';

import AdminSchedule from '../work-schedule/admin-schedule';
import WorkSchedule from '../work-schedule/work-schedule';

// Той самий брейкпоінт md, що й у SCSS: таблиця на 31 день на телефоні не читається.
const DESKTOP = '(min-width: 960px)';

const Page = () => {
  const [isDesktop, setIsDesktop] = useState<boolean | null>(null);

  useEffect(() => {
    const query = window.matchMedia(DESKTOP);
    const update = () => setIsDesktop(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  if (isDesktop === null) return null;
  return isDesktop ? <AdminSchedule /> : <WorkSchedule role="admin" />;
};

export default Page;
