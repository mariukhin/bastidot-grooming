import { ReactNode } from 'react';
import type { Metadata } from 'next';
import { Montserrat } from 'next/font/google';
import { GoogleOAuthProvider } from '@react-oauth/google';

import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { BookingModalHost } from '@/components/booking-modal';
import { Analytics } from '@/components/analytics';
import { SITE_DESCRIPTION, SITE_NAME, SITE_TITLE, SITE_URL } from '@/utils/site';

import 'normalize.css';
import 'simplebar-react/dist/simplebar.min.css';
import './globals.scss';

import dayjs from 'dayjs';
import 'dayjs/locale/uk';

dayjs.locale('uk');

const montserrat = Montserrat({
  variable: '--font-montserrat',
  subsets: ['latin', 'cyrillic'],
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: `%s — ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    'грумінг Київ',
    'грумінг салон',
    'стрижка собак Київ',
    'стрижка котів Київ',
    'тримінг',
    'гігієнічний комплекс',
    'Bastidot',
  ],
  openGraph: {
    type: 'website',
    locale: 'uk_UA',
    siteName: SITE_NAME,
    url: '/',
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: [{ url: '/favicon.ico' }],
  },
};

type RootLayoutProps = {
  children: ReactNode;
};

const RootLayout = ({ children }: Readonly<RootLayoutProps>) => {
  const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
  return (
    <html lang="uk">
      <body className={montserrat.variable} suppressHydrationWarning>
        {/* Runs before the first paint so reveal animations never hide content for no-JS visitors. */}
        <script
          dangerouslySetInnerHTML={{ __html: `document.documentElement.classList.add('js')` }}
        />
        <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
          <div id="header-scroll-sentinel" />
          <Header />
          <main>{children}</main>
          <div id="modal-root" />
          <BookingModalHost />
          <Footer />
          <Analytics />
        </GoogleOAuthProvider>
      </body>
    </html>
  );
};

export default RootLayout;
