import { API_URL } from './config';
export async function getServiceList(breedId: string) {
  try {
    const response = await fetch(`${API_URL}/service`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        breedId,
      }),
    });

    const data = await response.json();

    if (data) {
      return data;
    }
  } catch (err) {
    console.error(err);
  }
}
