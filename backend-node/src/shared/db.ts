import { MongoClient } from 'mongodb';
import { config } from './config.ts';
import { logger } from './logger.ts';

// Той самий URI-формат, що і в Go-версії (bootstrap/database.go)
const uri = `mongodb+srv://${config.dbUser}:${config.dbPass}@${config.dbHost}/${config.dbName}?retryWrites=true&w=majority&appName=Cluster`;

const client = new MongoClient(uri, {
  serverSelectionTimeoutMS: 10_000,
});

export async function connectToDatabase() {
  await client.connect();
  // Аналог client.Ping у Go — переконуємось, що кластер реально відповідає
  await client.db(config.dbName).command({ ping: 1 });
  logger.info('Connected to MongoDB');
  return client.db(config.dbName);
}

export async function closeDatabase() {
  await client.close();
  logger.info('Connection to MongoDB closed');
}
