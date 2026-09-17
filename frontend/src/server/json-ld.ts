import { ServiceProps } from '@/utils/function';
import { BUSINESS, SITE_DESCRIPTION, SITE_NAME, SITE_URL, SOCIAL } from '@/utils/site';

const WEEK = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;

type JsonLdInput = {
  services: ServiceProps[];
  rating: number | null;
  reviewCount: number | null;
};

export const buildBusinessJsonLd = ({
  services,
  rating,
  reviewCount,
}: JsonLdInput): Record<string, unknown> => {
  const businessId = `${SITE_URL}/#business`;
  const prices = services
    .map((service) => service.defaultPrice)
    .filter((price): price is number => typeof price === 'number' && price > 0);

  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': businessId,
    name: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: `${SITE_URL}/`,
    image: [`${SITE_URL}/hero-poster.jpg`, `${SITE_URL}/opengraph-image.jpg`],
    logo: `${SITE_URL}/big-logo.svg`,
    telephone: BUSINESS.phone,
    currenciesAccepted: 'UAH',
    address: {
      '@type': 'PostalAddress',
      streetAddress: BUSINESS.streetAddress,
      addressLocality: BUSINESS.addressLocality,
      postalCode: BUSINESS.postalCode,
      addressCountry: BUSINESS.addressCountry,
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: BUSINESS.latitude,
      longitude: BUSINESS.longitude,
    },
    hasMap: BUSINESS.mapUrl,
    areaServed: { '@type': 'City', name: BUSINESS.addressLocality },
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: [...WEEK],
        opens: BUSINESS.opens,
        closes: BUSINESS.closes,
      },
    ],
    sameAs: Object.values(SOCIAL),
  };

  if (rating !== null && reviewCount !== null && reviewCount > 0) {
    data.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: rating,
      ratingCount: reviewCount,
      bestRating: 5,
      worstRating: 1,
    };
  }

  if (prices.length > 0) {
    data.priceRange = `${Math.min(...prices)}–${Math.max(...prices)} ₴`;
  }

  if (services.length > 0) {
    data.makesOffer = services.map((service) => ({
      '@type': 'Offer',
      price: service.defaultPrice,
      priceCurrency: 'UAH',
      availability: 'https://schema.org/InStock',
      itemOffered: {
        '@type': 'Service',
        name: service.type,
        serviceType: 'Грумінг',
        provider: { '@id': businessId },
      },
    }));
  }

  return data;
};
