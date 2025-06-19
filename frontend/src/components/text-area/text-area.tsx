'use client';

import {
  TextareaHTMLAttributes,
  forwardRef,
  useId,
  useState,
  useImperativeHandle,
  useRef,
  ChangeEvent,
  useEffect,
} from 'react';
import classNames from 'classnames';

import styles from './text-area.module.scss';

type TextAreaProps = {
  label?: string;
  error?: string;
  required?: boolean;
  className?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
} & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'onChange'>;

const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ label, error, required, disabled, className, defaultValue = '', onChange, ...rest }, ref) => {
    const inputId = useId();
    const innerRef = useRef<HTMLTextAreaElement>(null);
    const [value, setValue] = useState(defaultValue);

    useImperativeHandle(ref, () => innerRef.current!);

    const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
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
        <textarea
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

TextArea.displayName = 'TextArea';

export default TextArea;
