export async function getBreedList() {
  try {
    const response = await fetch('http://localhost:8080/breed');

    const data = await response.json();

    if (data) {
      return data;
    }
  } catch (err) {
    console.error(err);
  }
}
