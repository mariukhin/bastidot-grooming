'use client';

import styles from './page.module.scss';
import useCounterStore from '@/store/useCounterStore';

const Dashboard = () => {
  const { count } = useCounterStore();

  return <div className={styles.wrapper}>Головна {count}</div>;
};

export default Dashboard;
