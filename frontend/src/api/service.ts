export async function getServiceList(breedId: string) {
  try {
    const response = await fetch('http://localhost:8080/service', {
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
