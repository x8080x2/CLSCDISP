

import { pool } from './db';

export async function initializeDatabase() {
  try {
    // Create session table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "session" (
        "sid" varchar NOT NULL COLLATE "default",
        "sess" json NOT NULL,
        "expire" timestamp(6) NOT NULL
      )
      WITH (OIDS=FALSE);
    `);
    
    // Only add primary key constraint if it doesn't exist
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'session_pkey' 
          AND table_name = 'session'
        ) THEN
          ALTER TABLE "session" ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid");
        END IF;
      END
      $$;
    `);
    
    // Only create index if it doesn't exist
    await pool.query(`
      CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
    `);
    
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

