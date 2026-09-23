export const GA_ID = process.env.NEXT_PUBLIC_GA_ID ?? '';

export type AnalyticsParams = Record<string, string | number | boolean | undefined>;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (command: string, ...args: unknown[]) => void;
  }
}

export const track = (event: string, params?: AnalyticsParams): void => {
  if (typeof window === 'undefined') return;

  window.gtag?.('event', event, params);
};
