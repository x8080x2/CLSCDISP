import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from "@shared/schema";
import { mkdirSync } from 'fs';
import { dirname } from 'path';

const dbPath = './database.sqlite';

// Ensure the directory exists
try {
  mkdirSync(dirname(dbPath), { recursive: true });
} catch (error) {
  // Directory already exists or other error, continue
}

// Create SQLite database connection
const sqlite = new Database(dbPath);

// Enable foreign keys
sqlite.pragma('foreign_keys = ON');

export const db = drizzle(sqlite, { schema });