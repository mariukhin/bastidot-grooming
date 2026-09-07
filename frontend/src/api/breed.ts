import { API_URL } from './config';
export async function getBreedList() {
  try {
    const response = await fetch(`${API_URL}/breed`);

    const data = await response.json();

    if (data) {
      return data;
    }
  } catch (err) {
    console.error(err);
  }
}
