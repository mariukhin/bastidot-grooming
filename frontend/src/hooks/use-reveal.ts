import { useCallback, useEffect, useRef } from 'react';

const ROOT_MARGIN = '0px 0px -8% 0px';
const THRESHOLD = 0.08;

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const useReveal = <T extends Element = HTMLDivElement>() => {
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    return () => {
      observerRef.current?.disconnect();
      observerRef.current = null;
    };
  }, []);

  const revealRef = useCallback((node: T | null) => {
    if (!node) return;

    if (prefersReducedMotion()) {
      node.classList.add('is-in');
      return;
    }

    node.classList.add('reveal');

    if (!observerRef.current) {
      observerRef.current = new IntersectionObserver(
        (entries, observer) => {
          entries.forEach((entry) => {
            // Also reveal if the element is already scrolled past (top at or
            // above the viewport) — an instant jump (history restore, hash
            // navigation, a huge scroll delta) can skip the "entering" frame
            // entirely, and isIntersecting alone would never fire for it.
            if (entry.isIntersecting || entry.boundingClientRect.top <= 0) {
              entry.target.classList.add('is-in');
              observer.unobserve(entry.target);
            }
          });
        },
        { rootMargin: ROOT_MARGIN, threshold: THRESHOLD }
      );
    }

    observerRef.current.observe(node);
  }, []);

  return revealRef;
};
