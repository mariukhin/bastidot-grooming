'use client';

import { useEffect, useState } from 'react';

import { Button } from '@/components/button';
import { TextInput } from '@/components/text-input';
import { PhoneInput } from '@/components/phone-input';
import { requestPhoneCode, verifyPhoneCode, type OtpChannel } from '@/api/otp';
import { hydrateProfile } from '@/utils/session';
import useUserStore from '@/store/useUserStore';
import useToastStore from '@/store/useToastStore';
import { BUSINESS, BUSINESS_PHONE_DISPLAY } from '@/utils/site';

import styles from './account.module.scss';

const CHANNEL_LABEL: Record<OtpChannel, string> = {
  telegram: 'у Telegram',
  sms: 'в SMS',
  log: 'у журнал сервера',
};

const VerifyPhone = () => {
  const { user, mergeUser } = useUserStore();
  const showToast = useToastStore((state) => state.showToast);

  const [phone, setPhone] = useState(user?.phoneNumber ?? '');
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [sentChannel, setSentChannel] = useState<OtpChannel | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  if (!user || user.phoneVerified) return null;

  const send = async (channel?: 'sms') => {
    setError(null);
    setIsPending(true);
    const result = await requestPhoneCode(phone, channel);
    setIsPending(false);

    if (!result.ok) {
      setError(result.message);
      if (result.retryAfterSec) setCooldown(result.retryAfterSec);
      return;
    }

    setSentChannel(result.channel);
    setPhone(result.phone);
    setIsEditingPhone(false);
    setCooldown(result.resendAfterSec);
    showToast(`Код надіслано ${CHANNEL_LABEL[result.channel]}`);
  };

  const submit = async () => {
    setError(null);
    setIsPending(true);
    const result = await verifyPhoneCode(code);
    setIsPending(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    if (result.outcome === 'taken') {
      setError(
        'Номер підтверджено, але картку клієнта вже закріплено за іншим акаунтом. Зателефонуйте нам, і ми розберемось'
      );
    } else {
      showToast(
        result.outcome === 'linked-existing'
          ? 'Номер підтверджено — ваші візити й улюбленці вже тут'
          : 'Номер підтверджено'
      );
    }

    mergeUser({ phoneVerified: true, phoneNumber: result.phone });
    void hydrateProfile();
  };

  return (
    <section className={styles.verifyCard} aria-labelledby="verify-phone-title">
      <h2 className={styles.verifyTitle} id="verify-phone-title">
        Підтвердіть номер телефону
      </h2>
      <p className={styles.verifyText}>
        Ваші візити й улюбленці зберігаються в салоні за номером телефону. Підтвердіть його кодом —
        і вони зʼявляться тут.
      </p>

      {sentChannel ? (
        <>
          <p className={styles.verifyText}>
            Надіслали код {CHANNEL_LABEL[sentChannel]} на {phone}. Він діє 5 хвилин.
          </p>

          <div className={styles.verifyRow}>
            <TextInput
              label="Код з шести цифр"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="000000"
              defaultValue={code}
              onChange={(value) => setCode(value.replace(/\D/g, '').slice(0, 6))}
              error={error ?? undefined}
            />
            <Button
              type="button"
              text={isPending ? 'Перевіряємо…' : 'Підтвердити'}
              size="medium"
              disabled={isPending || code.length !== 6}
              onClick={() => void submit()}
            />
          </div>

          <div className={styles.verifyActions}>
            <button
              type="button"
              className={styles.verifyLink}
              disabled={isPending || cooldown > 0}
              onClick={() => void send()}
            >
              {cooldown > 0 ? `Надіслати ще раз через ${cooldown} с` : 'Надіслати ще раз'}
            </button>

            {sentChannel === 'telegram' && (
              <button
                type="button"
                className={styles.verifyLink}
                disabled={isPending || cooldown > 0}
                onClick={() => void send('sms')}
              >
                Не прийшло — надіслати SMS
              </button>
            )}
          </div>
        </>
      ) : (
        <>
          {isEditingPhone ? (
            <div className={styles.verifyRow}>
              <PhoneInput label="Номер телефону" defaultValue={phone} onChange={setPhone} />
            </div>
          ) : (
            <p className={styles.verifyPhone}>
              {phone || 'Номер не вказано'}{' '}
              <button
                type="button"
                className={styles.verifyLink}
                onClick={() => setIsEditingPhone(true)}
              >
                {phone ? 'інший номер' : 'вказати номер'}
              </button>
            </p>
          )}

          {error && (
            <p className={styles.verifyError} role="alert">
              {error}{' '}
              <a className={styles.phoneLink} href={`tel:${BUSINESS.phone}`}>
                {BUSINESS_PHONE_DISPLAY}
              </a>
            </p>
          )}

          <Button
            type="button"
            text={isPending ? 'Надсилаємо…' : 'Надіслати код'}
            size="medium"
            disabled={isPending || cooldown > 0 || phone.replace(/\D/g, '').length < 12}
            onClick={() => void send()}
          />
        </>
      )}
    </section>
  );
};

export default VerifyPhone;
