import type { Metadata } from 'next';

import styles from './page.module.scss';
import { HeroBlock } from '@/components/hero-block';
import { ServicesBlock } from '@/components/services-block';
// import { PublicationsBlock } from '@/components/publications-block';
import { TeamBlock } from '@/components/team-block';
// import { CoursesBlock } from '@/components/courses-block';
import { ReviewsBlock } from '@/components/reviews-block';
import { AboutBlock } from '@/components/about-block';
import { ContactsBlock } from '@/components/contacts-block';
import { JsonLd } from '@/components/json-ld';
import { getGroomers, getHomeCatalog } from '@/server/catalog';
import { fetchGoogleReviews } from '@/server/reviews';
import { buildBusinessJsonLd } from '@/server/json-ld';
import { normalizeReviews } from '@/utils/function';

export const revalidate = 300;

export const metadata: Metadata = {
  alternates: { canonical: '/' },
};

const Dashboard = async () => {
  const [catalog, groomers, reviewsResult] = await Promise.all([
    getHomeCatalog(),
    getGroomers(),
    fetchGoogleReviews(),
  ]);

  const reviews = reviewsResult.ok ? normalizeReviews(reviewsResult.reviews) : [];

  const jsonLd = buildBusinessJsonLd({
    services: catalog.serviceList,
    rating: reviewsResult.ok ? reviewsResult.rating : null,
    reviewCount: reviewsResult.ok ? reviewsResult.reviewCount : null,
  });

  return (
    <div className={styles.wrapper}>
      <JsonLd data={jsonLd} />
      <HeroBlock />
      <ServicesBlock
        breedList={catalog.breedList}
        initialBreedName={catalog.defaultBreedName}
        initialServiceList={catalog.serviceList}
      />
      {/*<PublicationsBlock />*/}
      <TeamBlock groomers={groomers} />
      {/*<CoursesBlock />*/}
      <ReviewsBlock reviews={reviews} />
      <AboutBlock />
      <ContactsBlock />
    </div>
  );
};

export default Dashboard;
