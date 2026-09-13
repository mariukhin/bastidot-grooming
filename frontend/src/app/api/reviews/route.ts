import { NextResponse } from 'next/server';
import { fetchGoogleReviews } from '@/server/reviews';

export async function GET() {
  const result = await fetchGoogleReviews();

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result.reviews);
}
