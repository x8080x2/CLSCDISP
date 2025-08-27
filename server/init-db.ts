
import { db } from './db';
import { sql } from 'drizzle-orm';
import * as schema from '@shared/schema';

export async function initializeDatabase() {
  try {
    // Create tables manually since we're using SQLite
    // This will create tables if they don't exist
    
    // Create users table
    db.run(sql`
      CREATE TABLE IF NOT EXISTS users (
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
      )
    `);

    // Create orders table
    db.run(sql`
      CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        order_number TEXT NOT NULL UNIQUE,
        description TEXT NOT NULL,
        pickup_address TEXT NOT NULL,
        delivery_address TEXT NOT NULL,
        service_type TEXT NOT NULL CHECK (service_type IN ('standard', 'express', 'same_day')),
        base_cost REAL NOT NULL,
        distance_fee REAL NOT NULL DEFAULT 0.00,
        total_cost REAL NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
        approval_status TEXT NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
        approved_by INTEGER,
        approved_at INTEGER,
        rejection_reason TEXT,
        special_instructions TEXT,
        notes TEXT,
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (approved_by) REFERENCES users(id)
      )
    `);

    // Create delivery_addresses table
    db.run(sql`
      CREATE TABLE IF NOT EXISTS delivery_addresses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        address TEXT NOT NULL,
        description TEXT,
        attached_files TEXT,
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        FOREIGN KEY (order_id) REFERENCES orders(id)
      )
    `);

    // Create transactions table
    db.run(sql`
      CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        order_id INTEGER,
        type TEXT NOT NULL CHECK (type IN ('top_up', 'order_payment', 'refund')),
        amount REAL NOT NULL,
        description TEXT NOT NULL,
        approval_status TEXT NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
        approved_by INTEGER,
        approved_at INTEGER,
        rejection_reason TEXT,
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (order_id) REFERENCES orders(id),
        FOREIGN KEY (approved_by) REFERENCES users(id)
      )
    `);
    
    console.log('Database initialized successfully with all tables created');
    
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

