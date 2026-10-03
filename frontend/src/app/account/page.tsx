'use client';

import useUserStore from '@/store/useUserStore';

import styles from './account.module.scss';

const ProfileTab = () => {
  const user = useUserStore((state) => state.user);
  if (!user) return null;

  const rows = [
    { label: "Ім'я", value: user.name || '—' },
    { label: 'Пошта', value: user.email },
    { label: 'Телефон', value: user.phoneNumber || '—' },
  ];

  return (
    <dl className={styles.details}>
      {rows.map(({ label, value }) => (
        <div key={label} className={styles.detailsRow}>
          <dt className={styles.detailsLabel}>{label}</dt>
          <dd className={styles.detailsValue}>{value}</dd>
        </div>
      ))}
    </dl>
  );
};

export default ProfileTab;
