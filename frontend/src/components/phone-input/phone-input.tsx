'use client';

import {
  forwardRef,
  useId,
  useImperativeHandle,
  useRef,
  useState,
  InputHTMLAttributes,
  KeyboardEvent,
  useEffect,
  useLayoutEffect,
} from 'react';
import classNames from 'classnames';

import { MASK, applyMask, extractDigits, getCursorPosFromDigits } from './utils';

import styles from './phone-input.module.scss';

type PhoneInputProps = {
  label?: string;
  error?: string;
  required?: boolean;
  defaultValue?: string;
  onChange?: (value: string) => void;
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>;

const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ label, error, required, defaultValue = '', onChange, disabled, readOnly, ...rest }, ref) => {
    const id = useId();
    const inputRef = useRef<HTMLInputElement>(null);

    const [digits, setDigits] = useState(() => extractDigits(defaultValue));
    const cursorPosition = useRef<number | null>(null);

    useImperativeHandle(ref, () => inputRef.current!);

    // Останнє, що ми самі віддали назовні. Без цього два ефекти нижче ходили б
    // по колу: вхідне значення вмикає setDigits, а той самий рендер устигав
    // відрапортувати ще старі цифри — і щойно підставлений номер затирався.
    const emitted = useRef<string | null>(null);

    // Маска тримає цифри у власному стані, тож номер, підставлений ззовні вже
    // після монтування (reset форми), сам у поле не потрапляє.
    useEffect(() => {
      if (defaultValue === emitted.current) return;
      setDigits(extractDigits(defaultValue));
    }, [defaultValue]);

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
      if (!inputRef.current || readOnly) return;

      if (/^\d$/.test(e.key)) {
        if (digits.length < 9) {
          const next = digits + e.key;
          setDigits(next);
          cursorPosition.current = getCursorPosFromDigits(next);
        }
        e.preventDefault();
      }

      if (e.key === 'Backspace') {
        if (digits.length > 0) {
          const next = digits.slice(0, -1);
          setDigits(next);
          cursorPosition.current = getCursorPosFromDigits(next);
        }
        e.preventDefault();
      }
    };

    useEffect(() => {
      const value = `+380${digits}`;
      if (value === emitted.current) return;

      emitted.current = value;
      onChange?.(value);
    }, [digits, onChange]);

    useLayoutEffect(() => {
      const pos = cursorPosition.current;
      if (inputRef.current && pos !== null) {
        requestAnimationFrame(() => {
          inputRef.current?.setSelectionRange(pos, pos);
        });
        cursorPosition.current = null;
      } else {
        cursorPosition.current = MASK.length;
      }
    }, [digits]);

    return (
      <div className={styles.wrapper}>
        {label && (
          <label htmlFor={id} className={styles.label}>
            {label} {required && <span className={styles.asterisk}>*</span>}
          </label>
        )}
        <input
          id={id}
          ref={inputRef}
          disabled={disabled}
          readOnly={readOnly}
          inputMode="numeric"
          autoComplete="off"
          value={applyMask(digits)}
          onKeyDown={handleKeyDown}
          onChange={(e) => e.preventDefault()}
          className={classNames(styles.input, {
            [styles.error]: !!error,
            [styles.disabled]: disabled || readOnly,
          })}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          {...rest}
        />
        {error && (
          <span id={`${id}-error`} role="alert" className={styles.errorText}>
            {error}
          </span>
        )}
      </div>
    );
  }
);

PhoneInput.displayName = 'PhoneInput';

export default PhoneInput;
