import { MongoClient } from 'mongodb';

const host = process.env.DB_HOST;
const user = process.env.DB_USER;
const pass = process.env.DB_PASS;
const dbName = process.env.DB_NAME;

const uri = `mongodb+srv://${user}:${pass}@${host}/${dbName}?retryWrites=true&w=majority&appName=Cluster`;

const client = new MongoClient(uri);
await client.connect();
const db = client.db(dbName);

const result = await db
  .collection('user')
  .updateMany(
    { username: { $in: ['Даша', 'Наталія'] }, isGroomer: true },
    { $set: { isGroomer: false } }
  );

console.log(JSON.stringify({ matchedCount: result.matchedCount, modifiedCount: result.modifiedCount }, null, 2));

const remaining = await db
  .collection('user')
  .find({ isGroomer: true }, { projection: { password: 0 } })
  .toArray();

console.log(JSON.stringify(remaining, null, 2));
await client.close();
