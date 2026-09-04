export type ReviewProps = {
  id: number;
  name: string;
  text: string;
  photoSrc: string;
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
};

export const normalizeReviews = (reviewsData: GoogleReviewProps[]): ReviewProps[] => {
  return reviewsData
    .filter((review) => review.rating >= 4)
    .map((review) => ({
      id: review.time,
      name: review.author_name,
      text: review.text,
      photoSrc: review.profile_photo_url,
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
