import { ObjectId } from 'mongodb';
import type { Db } from 'mongodb';

import { USER_COLLECTION, type User } from '../../shared/user.ts';
import { CLIENT_COLLECTION, type Client } from '../../shared/client.ts';

export type ProfileField = 'name' | 'email' | 'phoneNumber';

export class ProfileUpdateError extends Error {
  readonly status: number;
  readonly field?: ProfileField;

  constructor(message: string, status: number, field?: ProfileField) {
    super(message);
    this.status = status;
    this.field = field;
  }
}

export interface ProfileUpdateInput {
  name?: string;
  email?: string;
  phoneNumber?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function parseProfileUpdate(body: unknown): ProfileUpdateInput {
  if (typeof body !== 'object' || body === null) {
    throw new ProfileUpdateError('Некоректний запит', 400);
  }

  const b = body as Record<string, unknown>;
  const input: ProfileUpdateInput = {};

  if (b.name !== undefined) {
    if (typeof b.name !== 'string' || b.name.trim() === '') {
      throw new ProfileUpdateError("Ім'я не може бути порожнім", 400, 'name');
    }
    input.name = b.name.trim();
  }

  if (b.email !== undefined) {
    const email = typeof b.email === 'string' ? b.email.trim() : '';
    // Порожнє поле — це «пошти в мене немає», а не помилка: з нею акаунт
    // заводять за бажанням.
    if (email !== '' && !EMAIL_RE.test(email)) {
      throw new ProfileUpdateError('Невірний формат пошти', 400, 'email');
    }
    input.email = email.toLowerCase();
  }

  if (b.phoneNumber !== undefined) {
    input.phoneNumber = typeof b.phoneNumber === 'string' ? b.phoneNumber.trim() : '';
  }

  return input;
}

export async function updateProfile(
  db: Db,
  userId: string,
  input: ProfileUpdateInput
): Promise<User> {
  if (!ObjectId.isValid(userId)) {
    throw new ProfileUpdateError('Користувача не знайдено', 404);
  }

  const users = db.collection<User>(USER_COLLECTION);
  const _id = new ObjectId(userId);
  const user = await users.findOne({ _id });

  if (!user) {
    throw new ProfileUpdateError('Користувача не знайдено', 404);
  }

  if (input.phoneNumber !== undefined && input.phoneNumber !== user.phoneNumber) {
    throw new ProfileUpdateError(
      'Змінити номер можна лише після підтвердження кодом. Зателефонуйте нам — поки що міняємо вручну',
      409,
      'phoneNumber'
    );
  }

  const patch: Partial<User> = {};
  // Пошту не просто перезаписуємо: порожня означає прибрати поле, бо саме його
  // відсутність (а не '') не конфліктує в унікальному sparse-індексі.
  let dropEmail = false;

  if (input.name !== undefined && input.name !== user.username) {
    patch.username = input.name;
  }
  if (input.email !== undefined && input.email !== (user.email ?? '')) {
    if (input.email === '') {
      dropEmail = true;
    } else {
      const taken = await users.findOne({ email: input.email, _id: { $ne: _id } });
      if (taken) {
        throw new ProfileUpdateError('Ця пошта вже зайнята', 409, 'email');
      }
      patch.email = input.email;
    }
  }

  if (Object.keys(patch).length === 0 && !dropEmail) {
    return user;
  }

  try {
    await users.updateOne({ _id }, {
      ...(Object.keys(patch).length > 0 ? { $set: patch } : {}),
      ...(dropEmail ? { $unset: { email: '' } } : {}),
    });
  } catch (err) {
    // Унікальний індекс на email міг спрацювати між перевіркою і записом.
    if (/duplicate key/i.test(String(err))) {
      throw new ProfileUpdateError('Ця пошта вже зайнята', 409, 'email');
    }
    throw err;
  }

  // У картку клієнта прибрана пошта їде порожнім рядком: там це просто поле
  // контакту, і лишати в CRM адресу, від якої людина відмовилась, не можна.
  await syncClientCard(db, user.clientId, dropEmail ? { ...patch, email: '' } : patch);

  return dropEmail ? { ...user, ...patch, email: undefined } : { ...user, ...patch };
}

async function syncClientCard(
  db: Db,
  clientId: ObjectId | undefined,
  patch: Partial<User>
): Promise<void> {
  if (!clientId) return;

  const clientPatch: Partial<Client> = {};
  if (patch.username !== undefined) clientPatch.name = patch.username;
  if (patch.email !== undefined) clientPatch.email = patch.email;

  if (Object.keys(clientPatch).length === 0) return;

  await db.collection<Client>(CLIENT_COLLECTION).updateOne({ _id: clientId }, { $set: clientPatch });
}
