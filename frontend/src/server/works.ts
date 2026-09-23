import { ServiceProps } from '@/utils/function';
import { Work, WORKS } from '@/utils/works';
import { getServicesForBreeds } from './catalog';

export type ResolvedWork = Work & {
  service: ServiceProps | null;
};

export const getResolvedWorks = async (): Promise<ResolvedWork[]> => {
  if (WORKS.length === 0) {
    return [];
  }

  const breedNames = [...new Set(WORKS.map((work) => work.breedName))];
  const servicesByBreed = await getServicesForBreeds(breedNames);

  return WORKS.map((work) => ({
    ...work,
    service:
      servicesByBreed.get(work.breedName)?.find((item) => item.type === work.serviceType) ?? null,
  }));
};
