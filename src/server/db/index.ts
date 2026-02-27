import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * DB client singleton for Drizzle ORM + postgres-js.
 *
 * Uses lazy initialization — the connection is created on first import.
 * Requires DATABASE_URL environment variable to be set.
 *
 * In development with Next.js HMR, we cache the connection on globalThis
 * to avoid creating multiple connections during hot reloads.
 */

const globalForDb = globalThis as unknown as {
  connection: postgres.Sql | undefined;
};

function createConnection() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Please set it in your environment variables.",
    );
  }
  return postgres(url, { prepare: false });
}

export const connection =
  globalForDb.connection ?? createConnection();

if (process.env.NODE_ENV !== "production") {
  globalForDb.connection = connection;
}

export const db = drizzle(connection, { schema });
