'use client';

import { ButtonHTMLAttributes, FC } from 'react';
import classNames from 'classnames';

import { Icon, IconTypes } from '@/components/icon';

import styles from './button.module.scss';

type ButtonVariant = 'primary' | 'secondary';
type ButtonColor = 'red' | 'blue';
type ButtonSize = 'medium' | 'large';

type ButtonProps = {
  text: string;
  variant?: ButtonVariant;
  color?: ButtonColor;
  size?: ButtonSize;
  icon?: IconTypes;
} & ButtonHTMLAttributes<HTMLButtonElement>;

const Button: FC<ButtonProps> = ({
  text,
  variant = 'primary',
  color = 'red',
  size = 'medium',
  className,
  icon,
  ...rest
}) => {
  return (
    <button
      className={classNames(styles.button, styles[variant], styles[size], styles[color], className)}
      {...rest}
    >
      {text}
      {!!icon && (
        <Icon
          className={styles.icon}
          id={icon}
          width={size === 'large' ? 20 : 16}
          height={size === 'large' ? 20 : 16}
        />
      )}
    </button>
  );
};

export default Button;
