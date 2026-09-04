export type ReviewProps = {
  id: number;
  name: string;
  text: string;
  photoSrc: string;
  rating: number;
  date: string;
};

export type BreedDbProps = {
  id: string;
  name: string;
};

export type BreedProps = {
  id: string;
  label: string;
  value: string;
};

export type ServiceProps = {
  id: string;
  breedId: string;
  defaultPrice: number;
  durationHour: number;
  durationMin: number;
  type: string;
  vipPrice: number;
};

export type GoogleReviewProps = {
  rating: number;
  time: number;
  author_name: string;
  text: string;
  profile_photo_url: string;
  relative_time_description: string;
};

export const normalizeReviews = (reviewsData: GoogleReviewProps[]): ReviewProps[] => {
  return reviewsData
    .filter((review) => review.rating >= 4)
    .sort((a, b) => b.time - a.time)
    .slice(0, 5)
    .map((review) => ({
      id: review.time,
      name: review.author_name,
      text: review.text,
      photoSrc: review.profile_photo_url,
      rating: review.rating,
      date: review.relative_time_description,
    }));
};

export const normalizeBreedList = (breedList: BreedDbProps[]): BreedProps[] => {
  return breedList.map((breed: BreedDbProps) => ({
    id: breed.id,
    label: breed.name,
    value: breed.name,
  }));
};

export const isNavLinkActive = (
  href: string,
  anchorId: string | undefined,
  pathname: string,
  activeSection: string | null
): boolean => {
  if (anchorId) return activeSection === anchorId;
  if (href === '/') return pathname === '/' && !activeSection;
  return pathname === href;
};

export const handleScroll = (id: string) => {
  const element = document.getElementById(id);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth' });
  }
};
