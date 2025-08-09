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

export const normalizeReviews = (reviewsData: never[]): ReviewProps[] => {
  return reviewsData
    .filter((review: any) => review.rating >= 4)
    .map((review: any) => ({
      id: review.time,
      name: review['author_name'],
      text: review.text,
      photoSrc: review['profile_photo_url'],
    }));
};

export const normalizeBreedList = (breedList: BreedDbProps[]): BreedProps[] => {
  return breedList.map((breed: BreedDbProps) => ({
    id: breed.id,
    label: breed.name,
    value: breed.name,
  }));
};

export const handleScroll = (id: string) => {
  const element = document.getElementById(id);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth' });
  }
};
