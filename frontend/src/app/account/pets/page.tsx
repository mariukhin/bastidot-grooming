'use client';

import Image from 'next/image';

import { fetchAccountPets, type AccountPet } from '@/api/account';
import { BookingCta, EmptyState, ErrorState, LoadingState } from '@/components/account-state';
import { useAccountData } from '../use-account-data';

import styles from '../account.module.scss';

const plural = (n: number, forms: [string, string, string]): string => {
  const mod100 = n % 100;
  const mod10 = n % 10;
  if (mod100 >= 11 && mod100 <= 14) return forms[2];
  if (mod10 === 1) return forms[0];
  if (mod10 >= 2 && mod10 <= 4) return forms[1];
  return forms[2];
};

const facts = (pet: AccountPet): string =>
  [
    pet.breedName,
    pet.age > 0 ? `${pet.age} ${plural(pet.age, ['рік', 'роки', 'років'])}` : null,
    pet.weight > 0 ? `${pet.weight} кг` : null,
  ]
    .filter(Boolean)
    .join(' · ');

const PetsTab = () => {
  const { state, data, message, reload } = useAccountData(fetchAccountPets);

  if (state === 'loading') return <LoadingState label="Завантажуємо улюбленців" />;
  if (state === 'error') return <ErrorState message={message} onRetry={reload} />;

  if (data.length === 0) {
    return (
      <EmptyState
        title="Додайте першого улюбленця"
        text="Картка улюбленця створюється автоматично при записі — вкажіть кличку, і він зʼявиться тут."
        action={<BookingCta />}
      />
    );
  }

  return (
    <ul className={styles.cards}>
      {data.map((pet) => (
        <li key={pet.id} className={styles.card}>
          {pet.photoUrl ? (
            <Image className={styles.cardPhoto} src={pet.photoUrl} alt="" width={96} height={96} />
          ) : (
            <span className={styles.cardPhotoFallback} aria-hidden="true">
              🐾
            </span>
          )}
          <div className={styles.cardBody}>
            <p className={styles.cardTitle}>{pet.name}</p>
            {facts(pet) && <p className={styles.cardSub}>{facts(pet)}</p>}
            {pet.comment && <p className={styles.cardNote}>{pet.comment}</p>}
          </div>
        </li>
      ))}
    </ul>
  );
};

export default PetsTab;
