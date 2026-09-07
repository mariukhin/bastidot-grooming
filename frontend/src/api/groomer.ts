import { API_URL } from './config';
export async function getGroomerList() {
  try {
    const response = await fetch(`${API_URL}/groomer`);

    const data = await response.json();

    if (data) {
      return data;
    }
  } catch (err) {
    console.error(err);
  }
}
