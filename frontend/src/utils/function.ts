export type ReviewProps = {
  id: number;
  name: string;
  text: string;
  photoSrc: string;
};

export const normalizeReviews = (reviewsData: never[]): ReviewProps[] => {
  return reviewsData.map((review: any) => ({
    id: review.time,
    name: review['author_name'],
    text: review.text,
    photoSrc: review['profile_photo_url'],
  }));
};

export const handleScroll = (id: string) => {
  const element = document.getElementById(id);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth' });
  }
};
