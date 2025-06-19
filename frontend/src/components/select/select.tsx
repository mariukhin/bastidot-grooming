'use client';

import {
  forwardRef,
  useId,
  useRef,
  useImperativeHandle,
  useState,
  useEffect,
  useCallback,
  KeyboardEvent,
} from 'react';
import classNames from 'classnames';

import styles from './select.module.scss';

export type Option = {
  label: string;
  value: string;
};

type SelectProps = {
  label?: string;
  error?: string;
  required?: boolean;
  defaultValue?: string;
  options: Option[];
  className?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
};

const Select = forwardRef<HTMLDivElement, SelectProps>(
  ({ label, error, required, defaultValue = '', options, onChange, disabled, className }, ref) => {
    const id = useId();
    const wrapperRef = useRef<HTMLDivElement>(null);
    const [value, setValue] = useState(defaultValue);
    const [isOpen, setIsOpen] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);

    useImperativeHandle(ref, () => wrapperRef.current!);

    const selected = options.find((opt) => opt.value === value);

    const toggleDropdown = useCallback(() => {
      if (disabled) return;
      setIsOpen((prev) => !prev);
      if (!isOpen) {
        const index = options.findIndex((opt) => opt.value === value);
        setHighlightedIndex(index >= 0 ? index : 0);
      }
    }, [disabled, isOpen, options, value]);

    const handleOptionClick = (val: string) => {
      setValue(val);
      setIsOpen(false);
      onChange?.(val);
    };

    const handleOutsideClick = useCallback((e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    }, []);

    useEffect(() => {
      if (isOpen) {
        document.addEventListener('mousedown', handleOutsideClick);
      } else {
        document.removeEventListener('mousedown', handleOutsideClick);
      }
      return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, [isOpen, handleOutsideClick]);

    useEffect(() => {
      setValue(defaultValue);
    }, [defaultValue]);

    const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
      if (disabled) return;

      if (e.key === 'Enter') {
        e.preventDefault();
        if (isOpen) {
          if (highlightedIndex >= 0) {
            const option = options[highlightedIndex];
            if (option) handleOptionClick(option.value);
          }
        } else {
          toggleDropdown();
        }
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        setIsOpen(false);
        setHighlightedIndex(-1);
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (!isOpen) {
          toggleDropdown();
        } else {
          setHighlightedIndex((prev) => Math.min(prev + 1, options.length - 1));
        }
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (!isOpen) {
          toggleDropdown();
        } else {
          setHighlightedIndex((prev) => Math.max(prev - 1, 0));
        }
      }
    };

    return (
      <div className={classNames(styles.wrapper, className)} ref={wrapperRef}>
        {label && (
          <label htmlFor={id} className={styles.label}>
            {label} {required && <span className={styles.asterisk}>*</span>}
          </label>
        )}
        <div
          className={classNames(styles.input, {
            [styles.error]: !!error,
            [styles.disabled]: disabled,
            [styles.open]: isOpen,
          })}
          role="button"
          tabIndex={0}
          onClick={toggleDropdown}
          onKeyDown={handleKeyDown}
          aria-expanded={isOpen}
          aria-disabled={disabled}
        >
          <span className={styles.value}>{selected?.label || '—'}</span>
          <span className={styles.arrow} />
        </div>
        {isOpen && (
          <ul className={styles.dropdown}>
            {options.length === 0 ? (
              <li className={classNames(styles.option, styles.empty)}>No data</li>
            ) : (
              options.map((option, index) => (
                <li
                  key={option.value}
                  className={classNames(styles.option, {
                    [styles.selected]: option.value === value,
                    [styles.highlighted]: index === highlightedIndex,
                  })}
                  onClick={() => handleOptionClick(option.value)}
                >
                  {option.label}
                </li>
              ))
            )}
          </ul>
        )}
        {error && (
          <span id={`${id}-error`} role="alert" className={styles.errorText}>
            {error}
          </span>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

export default Select;
