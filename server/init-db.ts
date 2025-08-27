
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { db } from './db';

export async function initializeDatabase() {
  try {
    // For SQLite with Drizzle, we can run migrations automatically
    // or just ensure the database is connected
    
    // Test the database connection by running a simple query
    const result = db.run('SELECT 1 as test');
    
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

