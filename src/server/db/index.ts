import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * DB client singleton for Drizzle ORM + postgres-js.
 *
 * Uses lazy initialization — the connection is created on first property access.
 * Requires DATABASE_URL environment variable to be set at runtime.
 *
 * In development with Next.js HMR, we cache the connection on globalThis
 * to avoid creating multiple connections during hot reloads.
 */

const globalForDb = globalThis as unknown as {
  db: PostgresJsDatabase<typeof schema> | undefined;
};

function getDb() {
  if (!globalForDb.db) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error("DATABASE_URL is not set. Please set it in your environment variables.");
    }
    const connection = postgres(url, {
      prepare: false,
      max: 1,
      idle_timeout: 20,
      connect_timeout: 10,
    });
    globalForDb.db = drizzle(connection, { schema });
  }
  return globalForDb.db;
}

export const db = new Proxy({} as PostgresJsDatabase<typeof schema>, {
  get(_, prop) {
    return getDb()[prop as keyof PostgresJsDatabase<typeof schema>];
  },
});
