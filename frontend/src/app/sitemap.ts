import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/utils/site';
import { PRIVACY_PATH } from '@/utils/privacy';

// Лендинг з однієї сторінки: секції (#services, #reviews, …) — це якорі всередині
// того самого документа, а не окремі URL, тож у sitemap їм не місце.
const sitemap = (): MetadataRoute.Sitemap => [
  {
    url: `${SITE_URL}/`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 1,
  },
  {
    url: `${SITE_URL}${PRIVACY_PATH}`,
    lastModified: new Date(),
    changeFrequency: 'yearly',
    priority: 0.2,
  },
];

export default sitemap;
