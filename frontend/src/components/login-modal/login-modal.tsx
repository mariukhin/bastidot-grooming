import { FC, MouseEvent, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { useGoogleLogin } from '@react-oauth/google';

import { Button } from '@/components/button';
import { useFocusTrapping } from '@/hooks/use-focus-trapping';

import styles from './login-modal.module.scss';
import { Controller, useForm } from 'react-hook-form';
import { TextInput } from '@/components/text-input';
import { yupResolver } from '@hookform/resolvers/yup';
import { object, ObjectSchema, string } from 'yup';
import { IconTypes } from '@/components/icon';
import { authClient, authClientGoogle, signUp } from '@/api/auth';
import useUserStore from '@/store/useUserStore';
import useLoginStore from '@/store/useLoginStore';
import { hydrateProfile } from '@/utils/session';
import { PhoneInput } from '@/components/phone-input';

export type LoginFormData = {
  /** Чим входять: пошта або телефон. Заповнюється лише на формі входу. */
  login: string;
  /** Пошта при реєстрації — необовʼязкова. */
  email: string;
  password: string;
  phoneNumber?: string;
  username?: string;
};

const loginValidationSchema = (isSignup: boolean): ObjectSchema<LoginFormData> =>
  object({
    login: isSignup ? string().optional() : string().required('Вкажіть пошту або телефон'),
    // Акаунт тримається на телефоні, тож пошту питаємо, але не вимагаємо;
    // перевіряємо формат лише коли її таки ввели.
    email: string().email('Невірний формат пошти').optional(),
    password: string().required('Вкажіть пароль'),
    username: isSignup ? string().required("Вкажіть ім'я") : string().optional(),
    phoneNumber: isSignup
      ? string().matches(/^\+380\d{9}$/, 'Вкажіть номер повністю')
      : string().optional(),
  }) as ObjectSchema<LoginFormData>;

const LoginModal: FC = () => {
  const router = useRouter();
  const { isOpen, redirectTo, closeLogin } = useLoginStore();
  const modalRef = useRef<HTMLDivElement>(null);

  const { setSession } = useUserStore();

  const [mounted, setMounted] = useState(false);
  const [modalRoot, setModalRoot] = useState<HTMLElement | null>(null);
  const [isSignUp, setIsSignUp] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validationSchema = loginValidationSchema(isSignUp);

  const {
    control,
    reset,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: yupResolver(validationSchema),
    defaultValues: {
      login: '',
      email: '',
      password: '',
      phoneNumber: '',
      username: '',
    },
  });

  const getTitle = (value: boolean) => {
    return value ? 'Зареєструватися' : 'Увійти';
  };

  const subtitle = isSignUp ? 'Вже маєте аккаунт?' : 'Не маєте аккаунту?';

  const closeModal = () => {
    reset();
    setAuthError(null);
    // Модалка лишається змонтованою, тож без скидання кнопка «Увійти» в шапці
    // відкривала б форму реєстрації — ту, на якій її закрили минулого разу.
    setIsSignUp(false);
    closeLogin();
  };

  // Після входу повертаємо туди, куди людина йшла до того, як її розвернув guard.
  const finishLogin = () => {
    const target = redirectTo;
    closeModal();
    if (target) {
      router.push(target);
    }
  };

  useFocusTrapping({ ref: modalRef, open: true, onEscape: closeModal });

  useEffect(() => {
    setMounted(true);
    setModalRoot(document.getElementById('modal-root'));
  }, []);

  useEffect(() => {
    if (!isOpen || !mounted) return;

    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = '';
    };
  }, [mounted]);

  const handleBackdropClick = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      closeModal();
    }
  };

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setAuthError(null);
      const result = await authClientGoogle(tokenResponse.access_token);

      if (!result.ok) {
        setAuthError(result.message);
        return;
      }

      // Цей ендпоінт токенів не видає — зберігаємо лише профіль.
      setSession(
        { ...result.profile, role: result.tokens.role },
        result.tokens.accessToken,
        result.tokens.refreshToken
      );
      void hydrateProfile();
      finishLogin();
    },
    onError: () => setAuthError('Не вдалося увійти через Google. Спробуйте ще раз'),
  });

  const handleSubmitLoginModal = async (values: LoginFormData) => {
    setAuthError(null);
    setIsSubmitting(true);
    const result = isSignUp ? await signUp(values) : await authClient(values);
    setIsSubmitting(false);

    if (!result.ok) {
      setAuthError(result.message);
      return;
    }

    // Пароль у стан застосунку не кладемо — зберігаємо лише те, що показуємо.
    // Решту профілю (зокрема пошту, якщо її не вводили) підтягне hydrateProfile.
    setSession(
      {
        name: values.username ?? '',
        email: values.email ?? '',
        photoUrl: '',
        role: result.tokens.role,
      },
      result.tokens.accessToken,
      result.tokens.refreshToken
    );
    void hydrateProfile();
    finishLogin();
  };

  if (!isOpen || !mounted || !modalRoot) return null;

  return createPortal(
    <div className={styles.backdrop} onClick={handleBackdropClick}>
      <div
        className={styles.modal}
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-modal-title"
        tabIndex={-1}
      >
        <div className={styles.content}>
          <h2 className={styles.title} id="login-modal-title">
            {getTitle(isSignUp)}
          </h2>
          <form className={styles.form} onSubmit={handleSubmit(handleSubmitLoginModal)}>
            {isSignUp && (
              <>
                <Controller
                  control={control}
                  name={'username'}
                  render={({ field }) => (
                    <TextInput
                      label={"Ваше ім'я"}
                      required={isSignUp}
                      defaultValue={field.value}
                      placeholder={"Ваше ім'я"}
                      onChange={field.onChange}
                      error={errors?.username?.message}
                    />
                  )}
                />
                <Controller
                  control={control}
                  name={'phoneNumber'}
                  render={({ field }) => (
                    <PhoneInput
                      label={'Ваш номер телефону'}
                      required={isSignUp}
                      defaultValue={field.value}
                      onChange={field.onChange}
                      error={errors?.phoneNumber?.message}
                    />
                  )}
                />
                <Controller
                  control={control}
                  name={'email'}
                  render={({ field }) => (
                    <TextInput
                      label={'Ваша електронна пошта'}
                      defaultValue={field.value}
                      placeholder={'Наприклад: anna@gmail.com'}
                      onChange={field.onChange}
                      error={errors?.email?.message}
                    />
                  )}
                />
              </>
            )}
            {!isSignUp && (
              <Controller
                control={control}
                name={'login'}
                render={({ field }) => (
                  <TextInput
                    label={'Пошта або телефон'}
                    defaultValue={field.value}
                    required
                    placeholder={'anna@gmail.com або +380671234567'}
                    onChange={field.onChange}
                    error={errors?.login?.message}
                  />
                )}
              />
            )}
            <Controller
              control={control}
              name={'password'}
              render={({ field }) => (
                <TextInput
                  label={'Пароль'}
                  defaultValue={field.value}
                  type={'password'}
                  required
                  placeholder={'********'}
                  onChange={field.onChange}
                  error={errors?.password?.message}
                />
              )}
            />
            {authError && (
              <p className={styles.formError} role="alert">
                {authError}
              </p>
            )}
            <Button
              type={'submit'}
              text={isSubmitting ? 'Зачекайте…' : getTitle(isSignUp)}
              size={'large'}
              disabled={isSubmitting}
            />
          </form>
          <p className={styles.text}>або</p>
          <Button
            className={styles.loginGoogleButton}
            variant={'secondary'}
            color={'blue'}
            text={'Продовжити з Google'}
            icon={IconTypes.google}
            size={'large'}
            iconPosition={'start'}
            onClick={() => googleLogin()}
          />
          <p className={styles.text}>{subtitle}</p>
          <Button
            variant={'link'}
            text={getTitle(!isSignUp)}
            size={'large'}
            onClick={() => {
              setAuthError(null);
              setIsSignUp(!isSignUp);
            }}
          />
        </div>
      </div>
    </div>,
    modalRoot
  );
};

export default LoginModal;
