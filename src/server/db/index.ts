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

function parsePoolMax(raw: string | undefined): number {
  const fallback = 10;
  const parsed = Number.parseInt(raw ?? `${fallback}`, 10);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return parsed;
}

function getDb() {
  if (!globalForDb.db) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error("DATABASE_URL is not set. Please set it in your environment variables.");
    }

    const maxPoolSize = parsePoolMax(process.env.DATABASE_POOL_MAX);

    const connection = postgres(url, {
      prepare: false,
      max: maxPoolSize,
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
