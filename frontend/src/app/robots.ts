import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/utils/site';

const robots = (): MetadataRoute.Robots => ({
  rules: [
    {
      userAgent: '*',
      allow: '/',
      // Демо-сторінки й внутрішній API не мають потрапляти в індекс.
      disallow: ['/api/', '/academy', '/form-example'],
    },
  ],
  sitemap: `${SITE_URL}/sitemap.xml`,
  host: SITE_URL,
});

export default robots;
