import { LoginFormData } from '@/components/login-modal/login-modal';

export async function authClientGoogle(token: string) {
  try {
    const response = await fetch('http://localhost:8081/public/login/google', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token,
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

export async function authClient(userData: LoginFormData) {
  try {
    const response = await fetch('http://localhost:8080/public/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: userData.email,
        password: userData.password,
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

export async function signUp(userData: LoginFormData) {
  try {
    const response = await fetch('http://localhost:8080/public/signup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...userData,
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
