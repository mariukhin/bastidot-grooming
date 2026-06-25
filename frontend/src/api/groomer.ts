export async function getGroomerList() {
  try {
    const response = await fetch('http://localhost:8080/groomer');

    const data = await response.json();

    if (data) {
      return data;
    }
  } catch (err) {
    console.error(err);
  }
}
