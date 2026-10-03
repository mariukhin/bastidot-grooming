import type { Db } from 'mongodb';
import { ObjectId } from 'mongodb';
import { USER_COLLECTION, type User } from '../../shared/user.ts';
import { getRole, type Role } from '../../shared/role.ts';
import { CLIENT_COLLECTION, type Client } from '../../shared/client.ts';
import { normalizePhone } from '../../shared/phone.ts';
import { hashPassword } from '../../shared/password.ts';
import { signToken } from '../../shared/jwt.ts';
import { config } from '../../shared/config.ts';

export interface SignupInput {
  username: string;
  email: string;
  phoneNumber: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  /** Дублюється поруч із токеном, щоб фронт не мусив розбирати JWT. */
  role: Role;
}

async function getByEmail(db: Db, email: string): Promise<User | null> {
  return await db.collection<User>(USER_COLLECTION).findOne({ email });
}

async function getByPhone(db: Db, phoneNumber: string): Promise<User | null> {
  return await db.collection<User>(USER_COLLECTION).findOne({ phoneNumber });
}

async function getById(db: Db, id: string): Promise<User | null> {
  if (!ObjectId.isValid(id)) {
    return null;
  }
  return await db.collection<User>(USER_COLLECTION).findOne({ _id: new ObjectId(id) });
}

async function createUser(db: Db, input: SignupInput): Promise<User> {
  const user: User = {
    username: input.username,
    email: input.email,
    phoneNumber: input.phoneNumber,
    password: await hashPassword(input.password),
    photoUrl: '',
    isAdmin: false,
    isGroomer: false,
    isVip: false,
    createdAt: new Date(),
  };

  const result = await db.collection<User>(USER_COLLECTION).insertOne(user);
  return { ...user, _id: result.insertedId };
}

/**
 * Зводить акаунт із карткою клієнта в CRM.
 *
 * Нічого не перезаписує: якщо в акаунта вже є clientId — виходимо. Унікальний
 * індекс на clientId не дасть привʼязати одну картку до двох акаунтів, тож
 * конфлікт тут очікуваний і не є помилкою — просто лишаємо як було.
 */
async function linkClient(db: Db, userId: ObjectId, clientId: ObjectId): Promise<boolean> {
  try {
    const { modifiedCount } = await db
      .collection<User>(USER_COLLECTION)
      .updateOne(
        { _id: userId, clientId: { $exists: false } },
        { $set: { clientId } }
      );
    return modifiedCount > 0;
  } catch {
    return false;
  }
}

/** Шукає картку клієнта за телефоном — єдине поле, спільне для акаунта й CRM. */
async function findClientByPhone(db: Db, phoneNumber: string): Promise<ObjectId | null> {
  const phone = normalizePhone(phoneNumber);
  if (!phone) return null;

  const client = await db
    .collection<Client>(CLIENT_COLLECTION)
    .findOne(
      { $or: [{ phone: phone.phone }, { phoneRaw: phone.phoneRaw }] },
      { projection: { _id: 1 } }
    );

  return client?._id ?? null;
}

export interface GoogleProfileInput {
  username: string;
  email: string;
  photoUrl: string;
}

// Акаунт із Google отримує ПОРОЖНІЙ password. Це не «пароль за замовчуванням»:
// verifyPassword вимагає формат "salt:key", тож порожній рядок не підходить під
// жоден пароль, включно з порожнім. Увійти в такий акаунт можна лише через Google.
async function findOrCreateGoogleUser(db: Db, input: GoogleProfileInput): Promise<User> {
  const existing = await getByEmail(db, input.email);

  if (existing) {
    // Фото і імʼя в Google могли змінитись — підтягуємо, але нічого не затираємо
    // порожнім значенням.
    const patch: Partial<User> = {};
    if (input.photoUrl && input.photoUrl !== existing.photoUrl) patch.photoUrl = input.photoUrl;
    if (input.username && !existing.username) patch.username = input.username;

    if (Object.keys(patch).length > 0) {
      await db.collection<User>(USER_COLLECTION).updateOne({ _id: existing._id! }, { $set: patch });
      return { ...existing, ...patch };
    }
    return existing;
  }

  const user: User = {
    username: input.username,
    email: input.email,
    phoneNumber: '',
    password: '',
    photoUrl: input.photoUrl,
    isAdmin: false,
    isGroomer: false,
    isVip: false,
    createdAt: new Date(),
  };

  const result = await db.collection<User>(USER_COLLECTION).insertOne(user);
  return { ...user, _id: result.insertedId };
}

function createTokens(user: User): AuthTokens {
  const userId = user._id!.toHexString();
  const role = getRole(user);

  const accessToken = signToken(
    { id: userId, name: user.username, role },
    config.accessTokenSecret,
    config.accessTokenExpiryHour * 3600
  );

  // У refresh ролі немає свідомо: він живе 7 днів, і зафіксована в ньому роль
  // пережила б зміну прав. Роль щоразу виводиться наново при обміні токена.
  const refreshToken = signToken(
    { id: userId },
    config.refreshTokenSecret,
    config.refreshTokenExpiryHour * 3600
  );

  return { accessToken, refreshToken, role };
}

const AuthService = {
  getByEmail,
  getByPhone,
  getById,
  createUser,
  findOrCreateGoogleUser,
  linkClient,
  findClientByPhone,
  createTokens,
};

export default AuthService;
