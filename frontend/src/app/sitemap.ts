import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/utils/site';

// Лендинг з однієї сторінки: секції (#services, #reviews, …) — це якорі всередині
// того самого документа, а не окремі URL, тож у sitemap їм не місце.
const sitemap = (): MetadataRoute.Sitemap => [
  {
    url: `${SITE_URL}/`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 1,
  },
];

export default sitemap;
