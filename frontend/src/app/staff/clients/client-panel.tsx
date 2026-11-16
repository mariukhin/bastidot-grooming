'use client';

import { useEffect, useRef, useState } from 'react';
import classNames from 'classnames';

import { Button } from '@/components/button';
import { Icon, IconTypes } from '@/components/icon';
import { ErrorState, LoadingState } from '@/components/account-state';
import { STATUS_LABEL } from '@/components/schedule-grid';
import useBookingStore from '@/store/useBookingStore';
import { SEGMENT_LABEL, fetchClientCard, updateAdminClient, type ClientCard } from '@/api/staff';

import {
  SEGMENT_ORDER,
  TRAIT_WARNING_FROM,
  initials,
  money,
  monthYear,
  prettyPhone,
  shortDate,
  dateTime,
} from './format';
import styles from './clients.module.scss';

type ClientPanelProps = {
  clientId: string;
  onClose: () => void;
  /** Картку змінено (нотатка) — список можна оновити. */
  onChanged?: () => void;
};

type NoteState = 'idle' | 'saving' | 'saved' | 'error';

/** Пауза після останньої літери, перш ніж зберегти нотатку. */
const NOTE_DEBOUNCE_MS = 800;

const ClientPanel = ({ clientId, onClose, onChanged }: ClientPanelProps) => {
  const openBooking = useBookingStore((state) => state.openBooking);

  const [card, setCard] = useState<ClientCard | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [attempt, setAttempt] = useState(0);

  const [note, setNote] = useState('');
  const [noteState, setNoteState] = useState<NoteState>('idle');
  const savedNote = useRef('');

  useEffect(() => {
    let stale = false;
    setState('loading');
    void fetchClientCard(clientId).then((result) => {
      if (stale) return;
      if (!result.ok) {
        setMessage(result.message);
        setState('error');
        return;
      }
      setCard(result.data);
      setNote(result.data.adminNote);
      savedNote.current = result.data.adminNote;
      setNoteState('idle');
      setState('ready');
    });
    return () => {
      stale = true;
    };
  }, [clientId, attempt]);

  // Закрили картку чи перейшли на іншого клієнта посеред паузи — дозберігаємо,
  // інакше останні слова нотатки тихо загубляться.
  const latestNote = useRef(note);
  latestNote.current = note;
  useEffect(
    () => () => {
      if (latestNote.current !== savedNote.current) {
        void updateAdminClient(clientId, { adminNote: latestNote.current });
      }
    },
    [clientId]
  );

  // Автозбереження нотатки: пауза після набору, без кнопки «Зберегти».
  useEffect(() => {
    if (state !== 'ready' || note === savedNote.current) return;

    const timer = setTimeout(() => {
      setNoteState('saving');
      const value = note;
      void updateAdminClient(clientId, { adminNote: value }).then((result) => {
        if (result.ok) {
          savedNote.current = value;
          setNoteState('saved');
          onChanged?.();
        } else {
          setNoteState('error');
        }
      });
    }, NOTE_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [note, clientId, state, onChanged]);

  if (state === 'loading') {
    return (
      <aside className={styles.panel} aria-label="Картка клієнта">
        <LoadingState label="Завантажуємо картку" />
      </aside>
    );
  }
  if (state === 'error' || !card) {
    return (
      <aside className={styles.panel} aria-label="Картка клієнта">
        <ErrorState message={message} onRetry={() => setAttempt((n) => n + 1)} />
      </aside>
    );
  }

  const fullName = [card.name, card.lastName].filter(Boolean).join(' ');
  const digits = card.phone.replace(/\D/g, '');

  const newVisit = () => {
    const pet = card.pets[0];
    openBooking({
      admin: true,
      source: 'button',
      client: {
        id: card.id,
        name: fullName,
        phone: card.phone,
        visitsCount: card.stats.visitsCount,
        pets: card.pets.map((p) => ({
          id: p.id,
          name: p.name,
          breedId: p.breedId,
          breedName: p.breedName ?? p.breedCustom,
        })),
      },
      ...(pet ? { pet: { id: pet.id, name: pet.name } } : {}),
      ...(pet?.breedId ? { breedId: pet.breedId } : {}),
      ...(pet?.breedName ? { breedName: pet.breedName } : {}),
    });
  };

  return (
    <aside className={styles.panel} aria-label={`Картка клієнта: ${fullName}`}>
      <button
        type="button"
        className={styles.panelClose}
        onClick={onClose}
        aria-label="Закрити картку"
      >
        <Icon id={IconTypes.close} width={18} height={18} />
      </button>

      <header className={styles.panelHead}>
        <span className={styles.avatar} aria-hidden="true">
          {initials(fullName)}
        </span>
        <div className={styles.panelIdentity}>
          <h2 className={styles.panelName}>{fullName}</h2>
          <a className={styles.panelPhone} href={`tel:${card.phone}`}>
            {prettyPhone(card.phone)}
          </a>
          {card.since && <p className={styles.panelSince}>Клієнт з {monthYear(card.since)}</p>}
        </div>
      </header>

      {(card.segments.length > 0 || card.doNotContact) && (
        <div className={styles.badges}>
          {SEGMENT_ORDER.filter((s) => card.segments.includes(s)).map((s) => (
            <span key={s} className={classNames(styles.badge, styles[`seg_${s}`])}>
              {SEGMENT_LABEL[s]}
            </span>
          ))}
          {card.doNotContact && (
            <span className={classNames(styles.badge, styles.badgeWarn)}>Не турбувати</span>
          )}
        </div>
      )}

      <div className={styles.panelActions}>
        <Button type="button" text="Новий візит" size="medium" onClick={newVisit} />
        <a className={styles.actionLink} href={`tel:${card.phone}`}>
          Подзвонити
        </a>
        {/* Telegram відкриває чат за номером, якщо людина не сховала його в налаштуваннях. */}
        <a
          className={styles.actionLink}
          href={`https://t.me/+${digits}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          Написати
        </a>
      </div>

      <dl className={styles.figures}>
        <div className={styles.figure}>
          <dt>Візитів</dt>
          <dd>{card.stats.visitsCount}</dd>
        </div>
        <div className={styles.figure}>
          <dt>Витрачено</dt>
          <dd>{money(card.stats.spent)}</dd>
        </div>
        <div className={styles.figure}>
          <dt>Приходить</dt>
          <dd>
            {card.stats.avgIntervalDays === null ? '—' : `раз на ${card.stats.avgIntervalDays} дн.`}
          </dd>
        </div>
      </dl>

      {card.nextVisit && (
        <p className={styles.nextVisit}>
          Наступний візит: <strong>{dateTime(card.nextVisit.scheduledAt)}</strong>
          {card.nextVisit.groomer.name && ` · ${card.nextVisit.groomer.name}`}
        </p>
      )}

      {card.rebookHint && (
        <div className={styles.hint} role="note">
          <strong>{card.rebookHint.text}</strong>
          <span>Звичний інтервал минув {shortDate(card.rebookHint.dueAt)}.</span>
        </div>
      )}

      <section className={styles.panelSection} aria-labelledby="client-pets">
        <h3 className={styles.panelSectionTitle} id="client-pets">
          Улюбленці
        </h3>
        {card.pets.length === 0 ? (
          <p className={styles.muted}>Улюбленців ще не додано.</p>
        ) : (
          <ul className={styles.petList}>
            {card.pets.map((pet) => {
              const warnings = pet.traits.filter((t) => t.value >= TRAIT_WARNING_FROM);
              return (
                <li key={pet.id} className={styles.pet}>
                  <p className={styles.petName}>
                    {pet.name}
                    <span className={styles.petMeta}>
                      {[pet.breedName ?? pet.breedCustom, pet.weight ? `${pet.weight} кг` : null]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </p>
                  {warnings.length > 0 && (
                    <ul className={styles.warnings}>
                      {warnings.map((t) => (
                        <li key={t.key} className={styles.warning}>
                          ⚠ {t.label}: {t.value}/10
                        </li>
                      ))}
                    </ul>
                  )}
                  {pet.wishes && <p className={styles.petWishes}>{pet.wishes}</p>}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className={styles.panelSection} aria-labelledby="client-visits">
        <h3 className={styles.panelSectionTitle} id="client-visits">
          Останні візити
        </h3>
        {card.visits.length === 0 ? (
          <p className={styles.muted}>Візитів ще не було.</p>
        ) : (
          <ul className={styles.visitList}>
            {card.visits.map((visit) => (
              <li key={visit.id} className={styles.visit}>
                <div>
                  <p className={styles.visitWhen}>{shortDate(visit.scheduledAt)}</p>
                  <p className={styles.visitMeta}>
                    {[visit.petName, visit.groomer.name, visit.services.join(', ')]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </div>
                <div className={styles.visitAside}>
                  <span className={classNames(styles.status, styles[`status_${visit.status}`])}>
                    {STATUS_LABEL[visit.status]}
                  </span>
                  {visit.total > 0 && (
                    <span className={styles.visitTotal}>{money(visit.total)}</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={styles.panelSection}>
        <label className={styles.panelSectionTitle} htmlFor="admin-note">
          Нотатка адміністратора
        </label>
        <textarea
          id="admin-note"
          className={styles.note}
          value={note}
          maxLength={2000}
          rows={4}
          placeholder="Бачить лише персонал. Наприклад: просить без парфуму"
          onChange={(e) => {
            setNote(e.target.value);
            setNoteState('idle');
          }}
        />
        <p className={styles.noteStatus} aria-live="polite">
          {noteState === 'saving' && 'Зберігаємо…'}
          {noteState === 'saved' && 'Збережено'}
          {noteState === 'error' && 'Не вдалося зберегти — спробуйте ще раз'}
        </p>
      </section>
    </aside>
  );
};

export default ClientPanel;
