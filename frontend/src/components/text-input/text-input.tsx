'use client';

import {
  InputHTMLAttributes,
  forwardRef,
  useId,
  useState,
  useImperativeHandle,
  useRef,
  ChangeEvent,
  useEffect,
} from 'react';
import classNames from 'classnames';

import styles from './text-input.module.scss';

type TextInputProps = {
  label?: string;
  error?: string;
  required?: boolean;
  className?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>;

const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  ({ label, error, required, disabled, className, defaultValue = '', onChange, ...rest }, ref) => {
    const inputId = useId();
    const innerRef = useRef<HTMLInputElement>(null);
    const [value, setValue] = useState(defaultValue);

    useImperativeHandle(ref, () => innerRef.current!);

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
      const next = e.target.value;
      setValue(next);
      onChange?.(next);
    };

    useEffect(() => {
      setValue(defaultValue);
    }, [defaultValue]);

    return (
      <div className={classNames(styles.wrapper, className)}>
        {label && (
          <label htmlFor={inputId} className={styles.label}>
            {label} {required && <span className={styles.asterisk}>*</span>}
          </label>
        )}
        <input
          id={inputId}
          className={classNames(styles.input, {
            [styles.error]: !!error,
            [styles.disabled]: disabled,
          })}
          ref={innerRef}
          disabled={disabled}
          value={value}
          onChange={handleChange}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : undefined}
          {...rest}
        />
        {error && (
          <span id={`${inputId}-error`} role="alert" className={styles.errorText}>
            {error}
          </span>
        )}
      </div>
    );
  }
);

TextInput.displayName = 'TextInput';

export default TextInput;
