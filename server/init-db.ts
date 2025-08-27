
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { db } from './db';
import * as schema from '@shared/schema';

export async function initializeDatabase() {
  try {
    // Run migrations to create tables
    await migrate(db, { migrationsFolder: './migrations' });
    
    console.log('Database initialized successfully with all tables created');
    
    // Test the database connection by running a simple query
    const result = db.get(sql`SELECT 1 as test`);
    console.log('Database connection test:', result);
    
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

