import { API_URL } from './config';
export async function getServiceList(breedId: string) {
  try {
    const response = await fetch(`${API_URL}/service?breedId=${encodeURIComponent(breedId)}`);

    const data = await response.json();

    if (data) {
      return data;
    }
  } catch (err) {
    console.error(err);
  }
}
