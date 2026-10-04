'use client';

import Image from 'next/image';

import styles from './pet-modal.module.scss';

export const PetAvatar = ({
  photoUrl,
  species,
}: {
  photoUrl: string | null;
  species: 'dog' | 'cat';
}) => (
  <div className={styles.avatarRow}>
    <div className={styles.avatar}>
      {photoUrl ? (
        <Image className={styles.avatarPhoto} src={photoUrl} alt="" width={160} height={160} />
      ) : (
        <span className={styles.avatarPlaceholder} aria-hidden="true">
          {species === 'cat' ? '🐱' : '🐾'}
        </span>
      )}
    </div>
    <p className={styles.avatarHint}>Завантаження фото зʼявиться згодом</p>
  </div>
);
