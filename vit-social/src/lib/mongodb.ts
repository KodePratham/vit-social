import { MongoClient } from "mongodb";

let client: MongoClient | null = null;
let connectPromise: Promise<MongoClient> | null = null;

export function isMongoConfigured(): boolean {
  return Boolean(process.env.MONGODB_URI?.trim());
}

export function getMongoDbName(): string {
  return process.env.MONGODB_DB_NAME?.trim() || "vit_social";
}

export async function getMongoClient(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI?.trim();
  if (!uri) {
    throw new Error("MONGODB_URI is not set.");
  }

  if (client) {
    return client;
  }

  if (!connectPromise) {
    connectPromise = MongoClient.connect(uri).then((connected) => {
      client = connected;
      return connected;
    });
  }

  return connectPromise;
}

export const POSTS_COLLECTION = "posts";
