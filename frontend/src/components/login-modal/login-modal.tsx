import { FC, MouseEvent, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { Button } from '@/components/button';

import { useFocusTrapping } from '@/hooks/use-focus-trapping';

import styles from './login-modal.module.scss';
import { Controller, useForm } from 'react-hook-form';
import { TextInput } from '@/components/text-input';
import { yupResolver } from '@hookform/resolvers/yup';
import { object, ObjectSchema, string } from 'yup';
import { IconTypes } from '@/components/icon';

type LoginModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => void;
};

type LoginFormData = {
  email: string;
  password: string;
};

export const loginValidationSchema: ObjectSchema<LoginFormData> = object({
  email: string().email().required('Required'),
  password: string().required('Required'),
});

const LoginModal: FC<LoginModalProps> = ({ onClose, onSubmit, isOpen }) => {
  const modalRef = useRef<HTMLDivElement>(null);

  const [mounted, setMounted] = useState(false);
  const [modalRoot, setModalRoot] = useState<HTMLElement | null>(null);
  const [isSignUp, setIsSignUp] = useState<boolean>(false);

  const {
    control,
    reset,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: yupResolver(loginValidationSchema),
    defaultValues: {
      email: '',
      password: '',
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

  if (!isOpen || !mounted || !modalRoot) return null;

  return createPortal(
    <div className={styles.backdrop} onClick={handleBackdropClick}>
      <div className={styles.modal} ref={modalRef} role="dialog" aria-modal="true" tabIndex={-1}>
        <div className={styles.content}>
          <h2 className={styles.title}>{getTitle(isSignUp)}</h2>
          <form className={styles.form} onSubmit={handleSubmit(onSubmit)}>
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
            <Controller
              control={control}
              name={'password'}
              render={({ field }) => (
                <TextInput
                  label={'Пароль'}
                  defaultValue={field.value}
                  type={'password'}
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
