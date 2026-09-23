'use client';

import { useEffect } from 'react';
import Script from 'next/script';

import { GA_ID, track } from '@/utils/analytics';

const SOCIAL_NETWORKS: ReadonlyArray<readonly [string, RegExp]> = [
  ['instagram', /instagram\.com/i],
  ['facebook', /facebook\.com/i],
  ['youtube', /youtube\.com|youtu\.be/i],
  ['tiktok', /tiktok\.com/i],
  ['telegram', /t\.me|telegram\.(me|org)/i],
];

const socialNetwork = (href: string): string | null =>
  SOCIAL_NETWORKS.find(([, pattern]) => pattern.test(href))?.[0] ?? null;

const useOutboundTracking = (): void => {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const link = (event.target as HTMLElement | null)?.closest?.('a');
      const href = link?.getAttribute('href');
      if (!href) return;

      if (href.startsWith('tel:')) {
        track('contact_phone_click', { phone: href.replace('tel:', '') });
        return;
      }

      if (href.includes('maps.app.goo.gl') || href.includes('google.com/maps')) {
        track('contact_directions_click');
        return;
      }

      const network = socialNetwork(href);
      if (network) {
        track('contact_social_click', { network });
      }
    };

    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);
};

const Analytics = () => {
  useOutboundTracking();

  return (
    <>
      {GA_ID && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
            strategy="afterInteractive"
          />
          <Script id="ga4-init" strategy="afterInteractive">
            {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
window.gtag = gtag;
gtag('js', new Date());
gtag('config', '${GA_ID}');`}
          </Script>
        </>
      )}
    </>
  );
};

export default Analytics;
