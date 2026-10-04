'use client';

import { useState } from 'react';
import Image from 'next/image';

import classNames from 'classnames';

import { Button } from '@/components/button';
import { Icon, IconTypes } from '@/components/icon';
import { BookingCta, EmptyState, ErrorState, LoadingState } from '@/components/account-state';
import { PetModal } from '@/components/pet-modal';
import { deletePet, fetchAccountPets, type AccountPet } from '@/api/account';
import { useConfirmModal } from '@/hooks/use-confirm-modal';
import useBookingStore from '@/store/useBookingStore';
import useToastStore from '@/store/useToastStore';
import { formatAgeShort } from '@/utils/pet-age';
import { useAccountData } from '../use-account-data';

import styles from '../account.module.scss';

const breedLabel = (pet: AccountPet): string | null => pet.breedName ?? pet.breedCustom;

const facts = (pet: AccountPet): string => {
  const age = pet.birthDate ? formatAgeShort(new Date(pet.birthDate)) : null;
  return [breedLabel(pet), pet.weight > 0 ? `${pet.weight} кг` : null, age]
    .filter(Boolean)
    .join(' · ');
};

const PetsTab = () => {
  const { state, data, message, reload } = useAccountData(fetchAccountPets);
  const openBooking = useBookingStore((store) => store.openBooking);
  const showToast = useToastStore((store) => store.showToast);
  const { confirm, modal } = useConfirmModal();

  const [editing, setEditing] = useState<{ pet: AccountPet | null } | null>(null);

  const handleDelete = async (pet: AccountPet) => {
    const confirmed = await confirm({
      title: `Прибрати картку «${pet.name}»?`,
      text: 'Картка зникне з кабінету. Історія візитів залишиться на місці.',
      confirmButtonText: 'Прибрати',
      cancelButtonText: 'Скасувати',
    });
    if (!confirmed) return;

    const result = await deletePet(pet.id);
    if (result.ok) {
      showToast(`Картку «${pet.name}» прибрано`);
      reload();
    } else {
      showToast(result.message ?? 'Не вдалося прибрати', 'error');
    }
  };

  if (state === 'loading') return <LoadingState label="Завантажуємо улюбленців" />;
  if (state === 'error') return <ErrorState message={message} onRetry={reload} />;

  return (
    <>
      {data.length === 0 ? (
        <EmptyState
          title="Додайте першого улюбленця"
          text="Розкажіть про нього один раз — і грумер знатиме про вагу, породу й звички ще до візиту."
          action={
            <div className={styles.emptyActions}>
              <Button
                type="button"
                text="Додати улюбленця"
                size="medium"
                onClick={() => setEditing({ pet: null })}
              />
              <BookingCta />
            </div>
          }
        />
      ) : (
        <ul className={styles.petGrid}>
          {data.map((pet) => (
            <li key={pet.id} className={styles.petCard}>
              <div className={styles.petHead}>
                <div className={styles.petPhoto}>
                  {pet.photoUrl ? (
                    <Image src={pet.photoUrl} alt="" width={160} height={160} />
                  ) : (
                    <span className={styles.petPlaceholder} aria-hidden="true">
                      {pet.species === 'cat' ? '🐱' : '🐾'}
                    </span>
                  )}
                </div>

                <div className={styles.petSecondary}>
                  {/* Іконки без підписів, тож назву дії несе aria-label,
                      а кличка в ньому — щоб у списку кнопок було видно, чия це картка.
                      data-tooltip — підпис, видимий при наведенні й з клавіатури. */}
                  <button
                    type="button"
                    className={styles.petIconButton}
                    onClick={() => setEditing({ pet })}
                    aria-label={`Редагувати картку «${pet.name}»`}
                    data-tooltip="Редагувати"
                  >
                    <Icon id={IconTypes.edit} width={16} height={16} />
                  </button>
                  <button
                    type="button"
                    className={classNames(styles.petIconButton, styles.petIconButtonDanger)}
                    onClick={() => void handleDelete(pet)}
                    aria-label={`Видалити картку «${pet.name}»`}
                    data-tooltip="Видалити"
                  >
                    <Icon id={IconTypes.trash} width={16} height={16} />
                  </button>
                </div>
              </div>

              <div className={styles.petBody}>
                <p className={styles.petName}>{pet.name}</p>
                {facts(pet) && <p className={styles.petFacts}>{facts(pet)}</p>}
              </div>

              <div className={styles.petActions}>
                <Button
                  className={styles.petBook}
                  type="button"
                  text={`Записати «${pet.name}»`}
                  size="medium"
                  onClick={() =>
                    openBooking({
                      breedName: pet.breedName ?? undefined,
                      petName: pet.name,
                    })
                  }
                />
              </div>
            </li>
          ))}

          <li>
            <button
              type="button"
              className={styles.petAdd}
              onClick={() => setEditing({ pet: null })}
            >
              <span className={styles.petAddIcon} aria-hidden="true">
                +
              </span>
              Додати улюбленця
            </button>
          </li>
        </ul>
      )}

      {editing && (
        <PetModal
          pet={editing.pet}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            reload();
          }}
        />
      )}

      {modal}
    </>
  );
};

export default PetsTab;
