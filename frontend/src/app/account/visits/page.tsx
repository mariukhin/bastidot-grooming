'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';

import { Button } from '@/components/button';
import { BookingCta, EmptyState, ErrorState, LoadingState } from '@/components/account-state';
import { RescheduleModal, CancelledModal } from '@/components/reschedule-modal';
import { useConfirmModal } from '@/hooks/use-confirm-modal';
import { cancelOrder } from '@/api/order';
import { fetchAccountOrders, type AccountVisit, type VisitStatus } from '@/api/account';
import useToastStore from '@/store/useToastStore';
import useBookingStore from '@/store/useBookingStore';
import useUserStore from '@/store/useUserStore';
import { BUSINESS, BUSINESS_PHONE_DISPLAY } from '@/utils/site';
import { formatDuration } from '@/components/booking-modal/utils';

import styles from '../account.module.scss';

const STATUS_LABEL: Record<VisitStatus, string> = {
  pending: 'Заплановано',
  completed: 'Виконано',
  cancelled: 'Скасовано',
  no_show: 'Не зʼявився',
};

const ALL_PETS = '__all__';

const formatWhen = (iso: string): string =>
  new Intl.DateTimeFormat('uk-UA', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso));

const formatRange = (visit: AccountVisit): string => {
  const start = new Date(visit.scheduledAt);
  const end = new Date(start.getTime() + visit.durationMinutes * 60_000);
  const time = (d: Date) =>
    new Intl.DateTimeFormat('uk-UA', { hour: '2-digit', minute: '2-digit', hour12: false }).format(
      d
    );
  return `${formatWhen(visit.scheduledAt)}–${time(end)}`;
};

const serviceLine = (visit: AccountVisit): string => visit.services.map((s) => s.name).join(', ');

const isAwaitingStatus = (visit: AccountVisit): boolean =>
  visit.status === 'pending' && new Date(visit.scheduledAt).getTime() < Date.now();

const VisitsTab = () => {
  const showToast = useToastStore((store) => store.showToast);
  const user = useUserStore((store) => store.user);
  const openBooking = useBookingStore((store) => store.openBooking);
  const { confirm, modal } = useConfirmModal();

  const [upcoming, setUpcoming] = useState<AccountVisit[]>([]);
  const [past, setPast] = useState<AccountVisit[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [petFilter, setPetFilter] = useState(ALL_PETS);
  const [rescheduling, setRescheduling] = useState<AccountVisit | null>(null);
  const [cancelled, setCancelled] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let stale = false;
    setState('loading');

    void Promise.all([fetchAccountOrders('upcoming'), fetchAccountOrders('past')]).then(
      ([up, pst]) => {
        if (stale) return;
        if (!up.ok) {
          setMessage(up.message);
          setState('error');
          return;
        }
        if (!pst.ok) {
          setMessage(pst.message);
          setState('error');
          return;
        }
        setUpcoming(up.data.items);
        setPast(pst.data.items);
        setCursor(pst.data.nextCursor);
        setState('ready');
      }
    );

    return () => {
      stale = true;
    };
  }, [attempt, user?.phoneVerified]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  const loadMore = async () => {
    if (!cursor) return;
    setIsLoadingMore(true);
    const result = await fetchAccountOrders('past', cursor);
    setIsLoadingMore(false);

    if (result.ok) {
      setPast((prev) => [...prev, ...result.data.items]);
      setCursor(result.data.nextCursor);
    } else {
      showToast(result.message, 'error');
    }
  };

  // Фільтр показуємо лише коли улюбленців більше одного — інакше це зайвий
  // елемент керування, який нічого не змінює.
  const pets = useMemo(() => {
    const map = new Map<string, string>();
    [...upcoming, ...past].forEach((visit) => {
      if (visit.pet) map.set(visit.pet.id, visit.pet.name);
    });
    // Сортуємо за імʼям: інакше порядок залежить від того, чий візит трапився
    // першим, і перескакує після кожного оновлення списку.
    return [...map.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, 'uk'));
  }, [upcoming, past]);

  const matchesFilter = useCallback(
    (visit: AccountVisit) => petFilter === ALL_PETS || visit.pet?.id === petFilter,
    [petFilter]
  );

  const nextVisit = upcoming.filter(matchesFilter)[0] ?? null;
  const pastFiltered = past.filter(matchesFilter);

  const repeat = (visit: AccountVisit) =>
    openBooking({
      breedId: visit.breedId ?? undefined,
      breedName: visit.pet?.breedName ?? undefined,
      serviceIds: visit.services.map((service) => service.id),
      groomerId: visit.groomer?.id,
      pet: visit.pet ? { id: visit.pet.id, name: visit.pet.name } : undefined,
      startStep: 'datetime',
      source: 'repeat',
    });

  const handleCancel = async (visit: AccountVisit) => {
    const confirmed = await confirm({
      title: 'Скасувати візит?',
      text: `${formatWhen(visit.scheduledAt)} — запис буде скасовано. Якщо просто не підходить час, краще перенести.`,
      confirmButtonText: 'Так, скасувати',
      cancelButtonText: 'Не скасовувати',
    });
    if (!confirmed) return;

    const result = await cancelOrder(visit.id);
    if (result.ok) {
      setCancelled(formatRange(visit));
      reload();
    } else {
      showToast(result.message, 'error');
    }
  };

  if (state === 'loading') return <LoadingState label="Завантажуємо візити" />;
  if (state === 'error') return <ErrorState message={message} onRetry={reload} />;

  if (upcoming.length === 0 && past.length === 0 && !user?.phoneVerified) {
    return (
      <EmptyState
        title="Спершу підтвердіть номер"
        text="Історія візитів зберігається в салоні за номером телефону. Підтвердьте його у блоці вище — і вона зʼявиться тут."
      />
    );
  }

  if (upcoming.length === 0 && past.length === 0) {
    return (
      <EmptyState
        title="Ще не було візитів"
        text="Тут зʼявиться історія: дата, послуги, грумер і сума за кожен візит."
        action={<BookingCta />}
      />
    );
  }

  return (
    <>
      {pets.length > 1 && (
        <div className={styles.visitFilter}>
          <label className={styles.visitFilterLabel} htmlFor="pet-filter">
            Улюбленець
          </label>
          <select
            id="pet-filter"
            className={styles.visitFilterSelect}
            value={petFilter}
            onChange={(event) => setPetFilter(event.target.value)}
          >
            <option value={ALL_PETS}>Усі</option>
            {pets.map((pet) => (
              <option key={pet.id} value={pet.id}>
                {pet.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <section className={styles.nextVisit} aria-labelledby="next-visit-title">
        <h2 className={styles.visitSectionTitle} id="next-visit-title">
          Найближчий візит
        </h2>

        {nextVisit ? (
          <div className={styles.nextCard}>
            <p className={styles.nextWhen}>{formatRange(nextVisit)}</p>
            <p className={styles.nextDuration}>{formatDuration(nextVisit.durationMinutes)}</p>

            <div className={styles.nextRows}>
              {nextVisit.groomer && (
                <div className={styles.nextRow}>
                  {nextVisit.groomer.photoUrl ? (
                    <Image
                      className={styles.nextAvatar}
                      src={nextVisit.groomer.photoUrl}
                      alt=""
                      width={72}
                      height={72}
                    />
                  ) : (
                    <span className={styles.nextAvatarFallback} aria-hidden="true">
                      {nextVisit.groomer.name.charAt(0)}
                    </span>
                  )}
                  <div>
                    <p className={styles.nextLabel}>Грумер</p>
                    <p className={styles.nextValue}>{nextVisit.groomer.name}</p>
                  </div>
                </div>
              )}

              {nextVisit.pet && (
                <div>
                  <p className={styles.nextLabel}>Улюбленець</p>
                  <p className={styles.nextValue}>
                    {nextVisit.pet.name}
                    {nextVisit.pet.breedName && ` · ${nextVisit.pet.breedName}`}
                  </p>
                </div>
              )}

              <div>
                <p className={styles.nextLabel}>Послуги</p>
                <p className={styles.nextValue}>{serviceLine(nextVisit) || '—'}</p>
              </div>

              <div>
                <p className={styles.nextLabel}>Сума</p>
                <p className={styles.nextPrice}>{nextVisit.total} грн</p>
              </div>
            </div>

            <div className={styles.nextActions}>
              <Button
                type="button"
                text="Перенести"
                size="medium"
                disabled={!nextVisit.canReschedule}
                onClick={() => setRescheduling(nextVisit)}
              />
              <Button
                type="button"
                text="Скасувати"
                variant="secondary"
                size="medium"
                disabled={!nextVisit.canCancel}
                onClick={() => void handleCancel(nextVisit)}
              />
            </div>

            {!nextVisit.canReschedule && (
              <p className={styles.nextHint}>
                До візиту лишилось небагато, тож змінити його онлайн уже не можна. Зателефонуйте
                нам:{' '}
                <a className={styles.phoneLink} href={`tel:${BUSINESS.phone}`}>
                  {BUSINESS_PHONE_DISPLAY}
                </a>
              </p>
            )}
          </div>
        ) : (
          <p className={styles.nextEmpty}>
            Запланованих візитів немає. <BookingCta text="Записатись" />
          </p>
        )}
      </section>

      <section aria-labelledby="past-visits-title">
        <h2 className={styles.visitSectionTitle} id="past-visits-title">
          Минулі візити
        </h2>

        {pastFiltered.length === 0 ? (
          <p className={styles.nextEmpty}>Для цього улюбленця візитів ще не було.</p>
        ) : (
          <ul className={styles.cards}>
            {pastFiltered.map((visit) => (
              <li key={visit.id} className={styles.card}>
                <div className={styles.cardBody}>
                  <p className={styles.cardTitle}>{formatWhen(visit.scheduledAt)}</p>
                  {visit.pet && <p className={styles.cardSub}>{visit.pet.name}</p>}
                  {serviceLine(visit) && <p className={styles.cardNote}>{serviceLine(visit)}</p>}
                  {visit.groomer && (
                    <p className={styles.cardNote}>
                      Грумер: {visit.groomer.name}
                      {!visit.groomer.isActive && ' (більше не працює)'}
                    </p>
                  )}
                </div>

                <div className={styles.cardAside}>
                  <span
                    className={
                      isAwaitingStatus(visit)
                        ? styles.status_past
                        : styles[`status_${visit.status}`]
                    }
                  >
                    {isAwaitingStatus(visit) ? 'Візит минув' : STATUS_LABEL[visit.status]}
                  </span>
                  {visit.total > 0 && <p className={styles.cardPrice}>{visit.total} грн</p>}
                  <button
                    type="button"
                    className={styles.repeatButton}
                    onClick={() => repeat(visit)}
                  >
                    Повторити
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {cursor && (
          <div className={styles.loadMoreRow}>
            <Button
              type="button"
              text={isLoadingMore ? 'Завантажуємо…' : 'Показати ще'}
              variant="secondary"
              size="medium"
              disabled={isLoadingMore}
              onClick={() => void loadMore()}
            />
          </div>
        )}
      </section>

      {rescheduling && (
        <RescheduleModal
          visit={rescheduling}
          onClose={() => setRescheduling(null)}
          onDone={() => {
            setRescheduling(null);
            showToast('Візит перенесено');
            reload();
          }}
        />
      )}

      {cancelled && (
        <CancelledModal formattedDateTimeRange={cancelled} onClose={() => setCancelled(null)} />
      )}

      {modal}
    </>
  );
};

export default VisitsTab;
