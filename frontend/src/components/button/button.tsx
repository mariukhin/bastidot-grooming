'use client';

import { ButtonHTMLAttributes, FC } from 'react';
import classNames from 'classnames';

import styles from './button.module.scss';

type ButtonVariant = 'primary' | 'secondary';
type ButtonColor = 'red' | 'blue';
type ButtonSize = 'medium' | 'large';

type ButtonProps = {
  text: string;
  variant?: ButtonVariant;
  color?: ButtonColor;
  size?: ButtonSize;
  loading?: boolean;
} & ButtonHTMLAttributes<HTMLButtonElement>;

const Button: FC<ButtonProps> = ({
  text,
  variant = 'primary',
  color = 'red',
  size = 'medium',
  className,
  ...rest
}) => {
  return (
    <button
      className={classNames(styles.button, styles[variant], styles[size], styles[color], className)}
      {...rest}
    >
      {text}
    </button>
  );
};

export default Button;
