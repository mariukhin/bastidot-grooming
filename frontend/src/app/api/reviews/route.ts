import { NextResponse } from 'next/server';

const API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const PLACE_ID = 'ChIJb2bAn_v3kIcRBx8SZzY06J0';

export async function GET() {
  if (!API_KEY) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
  }

  const url = `https://maps.googleapis.com/maps/api/place/details/json?fields=reviews&place_id=${PLACE_ID}&reviews_sort=newest&language=uk&key=${API_KEY}`;

  const response = await fetch(url, { next: { revalidate: 3600 } });
  const data = await response.json();

  if (!response.ok || data.status !== 'OK') {
    return NextResponse.json({ error: data.error_message || data.status }, { status: 502 });
  }

  return NextResponse.json(data.result?.reviews ?? []);
}
