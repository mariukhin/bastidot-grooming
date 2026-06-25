import { FC, MouseEvent, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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
import { PhoneInput } from '@/components/phone-input';

type LoginModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export type LoginFormData = {
  email: string;
  password: string;
  phoneNumber?: string;
  username?: string;
};

const loginValidationSchema = (isSignup: boolean): ObjectSchema<LoginFormData> =>
  object({
    email: string().email('Invalid email format').required('Email is required'),
    password: string().required('Password is required'),
    username: isSignup ? string().required('Username is required for signup') : string().optional(),
    phoneNumber: isSignup
      ? string().required('Phone number is required for signup')
      : string().optional(),
  }) as ObjectSchema<LoginFormData>;

const LoginModal: FC<LoginModalProps> = ({ onClose, isOpen }) => {
  const modalRef = useRef<HTMLDivElement>(null);

  const { login, setAccessToken } = useUserStore();

  const [mounted, setMounted] = useState(false);
  const [modalRoot, setModalRoot] = useState<HTMLElement | null>(null);
  const [isSignUp, setIsSignUp] = useState<boolean>(false);

  const validationSchema = loginValidationSchema(isSignUp);

  const {
    control,
    reset,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: yupResolver(validationSchema),
    defaultValues: {
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
    onClose();
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
      const userData = await authClientGoogle(tokenResponse.access_token);
      login(userData);
      closeModal();
    },
    onError: (errorResponse) => console.log('Помилка авторизації:', errorResponse),
  });

  const handleSubmitLoginModal = async (values: LoginFormData) => {
    console.log('here', values);
    const result = isSignUp ? await signUp(values) : await authClient(values);
    if (result.error) {
      console.log('error', result.error);
    } else {
      login(values);
      setAccessToken(result.accessToken);
      closeModal();
    }
  };

  if (!isOpen || !mounted || !modalRoot) return null;

  return createPortal(
    <div className={styles.backdrop} onClick={handleBackdropClick}>
      <div className={styles.modal} ref={modalRef} role="dialog" aria-modal="true" tabIndex={-1}>
        <div className={styles.content}>
          <h2 className={styles.title}>{getTitle(isSignUp)}</h2>
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
              </>
            )}
            <Controller
              control={control}
              name={'email'}
              render={({ field }) => (
                <TextInput
                  label={'Ваша електронна пошта'}
                  defaultValue={field.value}
                  required
                  placeholder={'Наприклад: anna@gmail.com'}
                  onChange={field.onChange}
                  error={errors?.email?.message}
                />
              )}
            />
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
            <Button type={'submit'} text={getTitle(isSignUp)} size={'large'} />
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
            onClick={() => setIsSignUp(!isSignUp)}
          />
        </div>
      </div>
    </div>,
    modalRoot
  );
};

export default LoginModal;
