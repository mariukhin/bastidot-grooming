import { GoogleReviewProps } from '@/utils/function';

const PLACE_ID = 'ChIJb2bAn_v3kIcRBx8SZzY06J0';
const REVALIDATE_SECONDS = 3600;

export type GoogleReviewsResult =
  { ok: true; reviews: GoogleReviewProps[] } | { ok: false; status: number; error: string };

export const fetchGoogleReviews = async (): Promise<GoogleReviewsResult> => {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;

  if (!apiKey) {
    return { ok: false, status: 500, error: 'API key not configured' };
  }

  const url = `https://maps.googleapis.com/maps/api/place/details/json?fields=reviews&place_id=${PLACE_ID}&reviews_sort=newest&language=uk&key=${apiKey}`;

  try {
    const response = await fetch(url, { next: { revalidate: REVALIDATE_SECONDS } });
    const data = await response.json();

    if (!response.ok || data.status !== 'OK') {
      return { ok: false, status: 502, error: data.error_message || data.status };
    }

    return { ok: true, reviews: (data.result?.reviews ?? []) as GoogleReviewProps[] };
  } catch (err) {
    console.error('[reviews] google places request failed', err);
    return { ok: false, status: 502, error: 'Request failed' };
  }
};
