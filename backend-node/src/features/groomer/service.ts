import type { Db } from 'mongodb';
import { USER_COLLECTION, type User } from './types.ts';

async function fetchGroomers(db: Db): Promise<User[]> {
  const collection = db.collection<User>(USER_COLLECTION);
  return await collection.find({ isGroomer: true }, { projection: { password: 0 } }).toArray();
}

const GroomerService = {
  fetchGroomers: fetchGroomers
}

export default GroomerService;
