import type { Db } from 'mongodb';
import { ObjectId } from 'mongodb';
import { USER_COLLECTION, type User } from '../../shared/user.ts';
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

function createTokens(user: User): AuthTokens {
  const userId = user._id!.toHexString();

  const accessToken = signToken(
    { id: userId, name: user.username },
    config.accessTokenSecret,
    config.accessTokenExpiryHour * 3600
  );

  const refreshToken = signToken(
    { id: userId },
    config.refreshTokenSecret,
    config.refreshTokenExpiryHour * 3600
  );

  return { accessToken, refreshToken };
}

const AuthService = {
  getByEmail,
  getByPhone,
  getById,
  createUser,
  createTokens,
};

export default AuthService;
