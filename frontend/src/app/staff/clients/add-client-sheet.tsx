'use client';

import { useState } from 'react';

import { Button } from '@/components/button';
import { PhoneInput } from '@/components/phone-input';
import { createAdminClient } from '@/api/staff';

import { BottomSheet } from '../work-schedule/sheets';
import styles from './clients.module.scss';

type AddClientSheetProps = {
  onClose: () => void;
  /** Створено нового або знайдено наявного за номером — відкрити його картку. */
  onOpen: (clientId: string) => void;
};

type Field = 'name' | 'phone' | 'lastName' | 'email' | 'adminNote';

const AddClientSheet = ({ onClose, onOpen }: AddClientSheetProps) => {
  const [name, setName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ field?: Field; message: string } | null>(null);
  const [existingId, setExistingId] = useState<string | null>(null);

  const valid = name.trim().length > 0 && /^\+380\d{9}$/.test(phone);

  const submit = async () => {
    setBusy(true);
    setError(null);
    setExistingId(null);

    const result = await createAdminClient({
      name: name.trim(),
      phone,
      ...(lastName.trim() ? { lastName: lastName.trim() } : {}),
      ...(email.trim() ? { email: email.trim() } : {}),
      ...(note.trim() ? { adminNote: note.trim() } : {}),
    });
    setBusy(false);

    if (result.ok) {
      onOpen(result.data.id);
      return;
    }
    setError({ field: result.details?.field as Field | undefined, message: result.message });
    if (result.code === 'client-exists' && typeof result.details?.existingId === 'string') {
      setExistingId(result.details.existingId);
    }
  };

  const fieldError = (field: Field) =>
    error?.field === field ? <p className={styles.fieldError}>{error.message}</p> : null;

  return (
    <BottomSheet title="Новий клієнт" onClose={onClose}>
      <label className={styles.formField}>
        <span className={styles.formLabel}>Імʼя *</span>
        <input
          className={styles.input}
          value={name}
          maxLength={60}
          autoFocus
          onChange={(e) => setName(e.target.value)}
        />
        {fieldError('name')}
      </label>

      <label className={styles.formField}>
        <span className={styles.formLabel}>Прізвище</span>
        <input
          className={styles.input}
          value={lastName}
          maxLength={60}
          onChange={(e) => setLastName(e.target.value)}
        />
      </label>

      <div className={styles.formField}>
        <PhoneInput label="Телефон" required onChange={setPhone} />
        {fieldError('phone')}
      </div>

      <label className={styles.formField}>
        <span className={styles.formLabel}>Пошта</span>
        <input
          className={styles.input}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        {fieldError('email')}
      </label>

      <label className={styles.formField}>
        <span className={styles.formLabel}>Нотатка адміністратора</span>
        <textarea
          className={styles.note}
          rows={3}
          value={note}
          maxLength={2000}
          onChange={(e) => setNote(e.target.value)}
        />
      </label>

      {error && !error.field && <p className={styles.fieldError}>{error.message}</p>}

      {existingId && (
        <Button
          type="button"
          variant="secondary"
          text="Відкрити картку цього клієнта"
          block
          onClick={() => onOpen(existingId)}
        />
      )}

      <Button
        type="button"
        text={busy ? 'Зберігаємо…' : 'Додати клієнта'}
        disabled={busy || !valid}
        block
        onClick={() => void submit()}
      />
      <p className={styles.muted}>Улюбленця можна додати під час першого запису.</p>
    </BottomSheet>
  );
};

export default AddClientSheet;
