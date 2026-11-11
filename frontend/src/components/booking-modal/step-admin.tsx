'use client';

import { useEffect, useState } from 'react';
import classNames from 'classnames';

import { Button } from '@/components/button';
import { TextInput } from '@/components/text-input';
import { TextArea } from '@/components/text-area';
import { PhoneInput } from '@/components/phone-input';
import { applyMask, extractDigits } from '@/components/phone-input/utils';
import {
  ORDER_SOURCES,
  searchClients,
  type ClientSearchResult,
  type OrderSource,
} from '@/api/staff';
import { ServiceProps } from '@/utils/function';

import { Groomer } from './types';
import { formatDuration, getBookingTotals } from './utils';
import styles from './booking-modal.module.scss';

export type AdminBookingData = {
  clientId?: string;
  clientName?: string;
  clientPhone?: string;
  petId?: string;
  petName?: string;
  comment: string;
  source: OrderSource;
};

type StepAdminProps = {
  selectedServices: ServiceProps[];
  selectedExtraServices: ServiceProps[];
  selectedGroomer: Groomer | null;
  formattedDateTime: string | null;
  errorMessage?: string | null;
  isPending?: boolean;
  onSubmit: (data: AdminBookingData) => void;
};

const OTHER_PET = '__other__';

const StepAdmin = ({
  selectedServices,
  selectedExtraServices,
  selectedGroomer,
  formattedDateTime,
  errorMessage,
  isPending,
  onSubmit,
}: StepAdminProps) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ClientSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [client, setClient] = useState<ClientSearchResult | null>(null);

  const [petId, setPetId] = useState<string>(OTHER_PET);
  const [petName, setPetName] = useState('');
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [comment, setComment] = useState('');
  const [source, setSource] = useState<OrderSource>('Телефон');

  const { price, durationMinutes } = getBookingTotals(
    selectedServices,
    selectedExtraServices,
    selectedGroomer
  );

  // Шукаємо з паузою: інакше кожна літера — окремий запит до бази.
  useEffect(() => {
    if (client) return;

    const text = query.trim();
    if (text.length < 2) {
      setResults([]);
      return;
    }

    setSearching(true);
    const timer = setTimeout(() => {
      void searchClients(text).then((result) => {
        setSearching(false);
        setResults(result.ok ? result.data : []);
      });
    }, 300);

    return () => {
      clearTimeout(timer);
      setSearching(false);
    };
  }, [query, client]);

  const pickClient = (found: ClientSearchResult) => {
    setClient(found);
    setPetId(found.pets[0]?.id ?? OTHER_PET);
    setPetName('');
  };

  const clearClient = () => {
    setClient(null);
    setQuery('');
    setResults([]);
    setPetId(OTHER_PET);
  };

  const isNewClient = !client;
  const petChosen = petId !== OTHER_PET || petName.trim().length > 0;
  const canSubmit = isNewClient
    ? newName.trim().length > 1 && /^\+380\d{9}$/.test(newPhone) && petName.trim().length > 0
    : petChosen;

  const submit = () =>
    onSubmit({
      ...(client ? { clientId: client.id } : { clientName: newName.trim(), clientPhone: newPhone }),
      ...(petId !== OTHER_PET ? { petId } : { petName: petName.trim() }),
      comment: comment.trim(),
      source,
    });

  return (
    <div className={styles.stepContainer}>
      <h2 className={styles.title}>Клієнт</h2>

      <div className={classNames(styles.section, styles.sectionGrow, styles.formSection)}>
        {client ? (
          <div className={styles.contactsSummary}>
            <p className={styles.contactsSummaryText}>
              <strong>{client.name}</strong>, {applyMask(extractDigits(client.phone))}
              {client.visitsCount > 0 && ` · візитів: ${client.visitsCount}`}
            </p>
            <button type="button" className={styles.contactsSummaryButton} onClick={clearClient}>
              Змінити
            </button>
          </div>
        ) : (
          <>
            <TextInput
              label="Пошук клієнта"
              placeholder="Імʼя або телефон"
              defaultValue={query}
              onChange={setQuery}
            />

            {query.trim().length >= 2 && (
              <div className={styles.clientResults}>
                {searching && <p className={styles.clientHint}>Шукаємо…</p>}

                {!searching && results.length === 0 && (
                  <p className={styles.clientHint}>
                    Нікого не знайшли — заповніть дані нижче, створимо картку.
                  </p>
                )}

                {results.map((found) => (
                  <button
                    key={found.id}
                    type="button"
                    className={styles.clientRow}
                    onClick={() => pickClient(found)}
                  >
                    <span className={styles.clientName}>{found.name}</span>
                    <span className={styles.clientMeta}>
                      {applyMask(extractDigits(found.phone))}
                      {found.pets.length > 0 && ` · ${found.pets.map((p) => p.name).join(', ')}`}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {isNewClient && (
          <>
            <TextInput
              label="Імʼя клієнта"
              required
              placeholder="Наприклад: Анна"
              defaultValue={newName}
              onChange={setNewName}
            />
            <PhoneInput label="Телефон" required onChange={setNewPhone} />
          </>
        )}

        {client && client.pets.length > 0 && (
          <div className={styles.petChips} role="group" aria-label="Улюбленець">
            {client.pets.map((pet) => (
              <button
                key={pet.id}
                type="button"
                className={classNames(styles.petChip, petId === pet.id && styles.petChipActive)}
                aria-pressed={petId === pet.id}
                onClick={() => setPetId(pet.id)}
              >
                {pet.name}
                {pet.breedName && <span className={styles.petChipBreed}> · {pet.breedName}</span>}
              </button>
            ))}
            <button
              type="button"
              className={classNames(styles.petChip, petId === OTHER_PET && styles.petChipActive)}
              aria-pressed={petId === OTHER_PET}
              onClick={() => setPetId(OTHER_PET)}
            >
              Інший
            </button>
          </div>
        )}

        {petId === OTHER_PET && (
          <TextInput
            label="Кличка улюбленця"
            required
            placeholder="Наприклад: Ріккі"
            defaultValue={petName}
            onChange={setPetName}
          />
        )}

        <div className={styles.sourceGroup} role="radiogroup" aria-label="Джерело запису">
          <p className={styles.sectionLabel}>Джерело запису</p>
          <div className={styles.petChips}>
            {ORDER_SOURCES.map((item) => (
              <button
                key={item}
                type="button"
                role="radio"
                aria-checked={source === item}
                className={classNames(styles.petChip, source === item && styles.petChipActive)}
                onClick={() => setSource(item)}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <TextArea
          label="Коментар"
          placeholder="Що важливо памʼятати про цей візит"
          defaultValue={comment}
          onChange={setComment}
        />

        <div className={styles.bookingSummarySection}>
          <p className={styles.sectionLabel}>Запис</p>
          <div className={styles.bookingSummaryList}>
            <div className={styles.bookingSummaryRow}>
              <p className={styles.bookingSummaryText}>
                {[selectedServices[0]?.type, ...selectedExtraServices.map((s) => s.type)]
                  .filter(Boolean)
                  .join(', ')}
              </p>
            </div>
            {selectedGroomer && (
              <div className={styles.bookingSummaryRow}>
                <p className={styles.bookingSummaryText}>Грумер: {selectedGroomer.name}</p>
              </div>
            )}
            {formattedDateTime && (
              <div className={styles.bookingSummaryRow}>
                <p className={styles.bookingSummaryText}>{formattedDateTime}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className={styles.footer}>
        {price !== null && (
          <div className={styles.summaryTotalRow}>
            <p className={styles.summaryTotalLabel}>Разом</p>
            {durationMinutes > 0 && (
              <p className={styles.summaryTotalMeta}>{formatDuration(durationMinutes)}</p>
            )}
            <p className={styles.summaryTotalValue}>{price} грн</p>
          </div>
        )}

        {errorMessage && (
          <p className={styles.submitError} role="alert">
            {errorMessage}
          </p>
        )}

        <Button
          text="Створити запис"
          size="large"
          type="button"
          disabled={!canSubmit || isPending}
          onClick={submit}
        />
      </div>
    </div>
  );
};

export default StepAdmin;
