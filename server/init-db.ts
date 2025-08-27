
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { db } from './db';
import * as schema from '@shared/schema';

export async function initializeDatabase() {
  try {
    // Run migrations to create tables
    await migrate(db, { migrationsFolder: './migrations' });
    
    // Test the database connection by running a simple query
    const result = db.run('SELECT 1 as test');
    
    console.log('Database initialized successfully with all tables created');
  } catch (error) {
    console.error('Error initializing database:', error);
    
    // If migrations folder doesn't exist, create tables directly
    try {
      console.log('Creating tables directly from schema...');
      
      // Create tables using raw SQL as fallback
      db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        telegram_id TEXT UNIQUE,
        username TEXT NOT NULL,
        email TEXT UNIQUE,
        password TEXT,
        first_name TEXT,
        last_name TEXT,
        balance REAL NOT NULL DEFAULT 0.00,
        is_active INTEGER NOT NULL DEFAULT 1,
        is_admin INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL DEFAULT (unixepoch())
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id),
        order_number TEXT NOT NULL UNIQUE,
        description TEXT NOT NULL,
        pickup_address TEXT NOT NULL,
        delivery_address TEXT NOT NULL,
        service_type TEXT NOT NULL CHECK(service_type IN ('standard', 'express', 'same_day')),
        base_cost REAL NOT NULL,
        distance_fee REAL NOT NULL DEFAULT 0.00,
        total_cost REAL NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'in_progress', 'completed', 'cancelled')),
        approval_status TEXT NOT NULL DEFAULT 'pending' CHECK(approval_status IN ('pending', 'approved', 'rejected')),
        approved_by INTEGER REFERENCES users(id),
        approved_at INTEGER,
        rejection_reason TEXT,
        special_instructions TEXT,
        notes TEXT,
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        updated_at INTEGER NOT NULL DEFAULT (unixepoch())
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS delivery_addresses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER NOT NULL REFERENCES orders(id),
        name TEXT NOT NULL,
        address TEXT NOT NULL,
        description TEXT,
        attached_files TEXT,
        created_at INTEGER NOT NULL DEFAULT (unixepoch())
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id),
        order_id INTEGER REFERENCES orders(id),
        type TEXT NOT NULL CHECK(type IN ('top_up', 'order_payment', 'refund')),
        amount REAL NOT NULL,
        description TEXT NOT NULL,
        approval_status TEXT NOT NULL DEFAULT 'pending' CHECK(approval_status IN ('pending', 'approved', 'rejected')),
        approved_by INTEGER REFERENCES users(id),
        approved_at INTEGER,
        rejection_reason TEXT,
        created_at INTEGER NOT NULL DEFAULT (unixepoch())
      )`);

      console.log('Database tables created successfully');
    } catch (fallbackError) {
      console.error('Error creating tables directly:', fallbackError);
      throw fallbackError;
    }
  }
}

