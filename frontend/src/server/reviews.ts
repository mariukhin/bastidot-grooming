import { GoogleReviewProps } from '@/utils/function';
import { BUSINESS } from '@/utils/site';

const REVALIDATE_SECONDS = 3600;

export type GoogleReviewsResult =
  | {
      ok: true;
      reviews: GoogleReviewProps[];
      rating: number | null;
      reviewCount: number | null;
    }
  | { ok: false; status: number; error: string };

export const fetchGoogleReviews = async (): Promise<GoogleReviewsResult> => {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;

  if (!apiKey) {
    return { ok: false, status: 500, error: 'API key not configured' };
  }

  const url = `https://maps.googleapis.com/maps/api/place/details/json?fields=reviews,rating,user_ratings_total&place_id=${BUSINESS.placeId}&reviews_sort=newest&language=uk&key=${apiKey}`;

  try {
    const response = await fetch(url, { next: { revalidate: REVALIDATE_SECONDS } });
    const data = await response.json();

    if (!response.ok || data.status !== 'OK') {
      return { ok: false, status: 502, error: data.error_message || data.status };
    }

    const result = data.result ?? {};

    return {
      ok: true,
      reviews: (result.reviews ?? []) as GoogleReviewProps[],
      rating: typeof result.rating === 'number' ? result.rating : null,
      reviewCount: typeof result.user_ratings_total === 'number' ? result.user_ratings_total : null,
    };
  } catch (err) {
    console.error('[reviews] google places request failed', err);
    return { ok: false, status: 502, error: 'Request failed' };
  }
};
