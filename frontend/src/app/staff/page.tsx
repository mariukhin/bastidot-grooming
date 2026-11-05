'use client';

import useUserStore from '@/store/useUserStore';

import { scheduleTitle } from './nav';
import Stub from './stub';

const StaffSchedule = () => {
  const user = useUserStore((state) => state.user);
  if (!user) return null;

  return (
    <Stub
      title={scheduleTitle(user.role)}
      text={
        user.role === 'admin'
          ? 'Тут буде день салону: усі грумери, їхні записи й вільні вікна.'
          : 'Тут буде ваш день: записи, клички й картки улюбленців.'
      }
    />
  );
};

export default StaffSchedule;
