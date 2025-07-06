import { RefObject, KeyboardEvent, useEffect } from 'react';

type TUseFocusTrapping = {
  ref: RefObject<HTMLElement | null>;
  open: boolean;
  onEscape?: () => void;
};

export const useFocusTrapping = ({ ref, open, onEscape }: TUseFocusTrapping) => {
  useEffect(() => {
    const element = ref.current;

    if (!open || !element) return;

    element.focus?.();

    const focusableElements = element.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleKeyPress = (e: unknown) => {
      const event = e as KeyboardEvent;

      if (event.key === 'Tab') {
        if (event.shiftKey && document.activeElement === firstElement) {
          event.preventDefault();
          lastElement?.focus?.();
        } else if (!event.shiftKey && document.activeElement === lastElement) {
          event.preventDefault();
          firstElement?.focus?.();
        }
      }

      if (event.key === 'Escape') {
        onEscape?.();
      }
    };

    element.addEventListener('keydown', handleKeyPress);

    return () => {
      element.removeEventListener('keydown', handleKeyPress);
    };
  }, [open, ref, onEscape]);
};
