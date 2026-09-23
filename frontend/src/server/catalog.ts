import { API_URL } from '@/api/config';
import { BreedDbProps, BreedProps, normalizeBreedList, ServiceProps } from '@/utils/function';
import { GroomerDbProps } from '@/components/booking-modal/types';

export const DEFAULT_BREED_NAME = 'Мальтіпу';

const REVALIDATE_SECONDS = 300;

export type HomeCatalog = {
  breedList: BreedProps[];
  defaultBreedName: string;
  serviceList: ServiceProps[];
};

const request = async <T>(path: string, init?: RequestInit): Promise<T | null> => {
  try {
    const response = await fetch(`${API_URL}${path}`, init);

    if (!response.ok) {
      console.error(`[catalog] ${path} responded ${response.status}`);
      return null;
    }

    return (await response.json()) as T;
  } catch (err) {
    console.error(`[catalog] ${path} failed`, err);
    return null;
  }
};

const fetchBreedList = () =>
  request<BreedDbProps[]>('/breed', { next: { revalidate: REVALIDATE_SECONDS } });

const fetchServiceList = (breedId: string) =>
  request<ServiceProps[]>(`/service?breedId=${encodeURIComponent(breedId)}`, {
    next: { revalidate: REVALIDATE_SECONDS },
  });

export const getHomeCatalog = async (): Promise<HomeCatalog> => {
  const breeds = await fetchBreedList();
  const breedList = normalizeBreedList(Array.isArray(breeds) ? breeds : []);
  const defaultBreed = breedList.find((breed) => breed.value === DEFAULT_BREED_NAME);

  const services = defaultBreed ? await fetchServiceList(defaultBreed.id) : null;

  return {
    breedList,
    defaultBreedName: defaultBreed?.value ?? DEFAULT_BREED_NAME,
    serviceList: Array.isArray(services) ? services : [],
  };
};

// Послуги для кількох порід одразу — потрібні секції «Наші роботи», щоб
// кнопка на картці відкривала запис саме на ту послугу, яку на фото.
export const getServicesForBreeds = async (
  breedNames: string[]
): Promise<Map<string, ServiceProps[]>> => {
  const breeds = await fetchBreedList();
  const breedList = normalizeBreedList(Array.isArray(breeds) ? breeds : []);

  const entries = await Promise.all(
    breedNames.map(async (name) => {
      const breed = breedList.find((item) => item.value === name);
      const services = breed ? await fetchServiceList(breed.id) : null;
      return [name, Array.isArray(services) ? services : []] as const;
    })
  );

  return new Map(entries);
};

export const getGroomers = async (): Promise<GroomerDbProps[]> => {
  const groomers = await request<GroomerDbProps[]>('/groomer', {
    next: { revalidate: REVALIDATE_SECONDS },
  });

  return Array.isArray(groomers) ? groomers : [];
};
