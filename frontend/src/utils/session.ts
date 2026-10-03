import { fetchAccountProfile } from '@/api/account';
import useUserStore from '@/store/useUserStore';

/**
 * Дотягує імʼя, телефон і фото з /protected/profile.
 *
 * Відповідь на вхід за паролем містить лише токени — імʼя там узятися нема
 * звідки, і кабінет показував би прочерк. Тому профіль підтягуємо окремо:
 * і після входу, і при відновленні сесії, бо дані могли змінитись.
 */
export async function hydrateProfile(): Promise<void> {
  const result = await fetchAccountProfile();
  if (!result.ok) return;

  useUserStore.getState().mergeUser({
    name: result.data.name,
    email: result.data.email,
    photoUrl: result.data.photoUrl || '',
    phoneNumber: result.data.phoneNumber,
    role: result.data.role,
  });
}
