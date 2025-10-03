/**
 * Database migration runner
 * Automatically runs SQL migration files on server startup
 */
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { query } from './database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to migrations directory
const MIGRATIONS_DIR = path.join(__dirname, '../../../database/migrations');

/**
 * Create migrations tracking table if it doesn't exist
 */
async function createMigrationsTable() {
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      migration_name VARCHAR(255) UNIQUE NOT NULL,
      applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;
  
  try {
    await query(createTableSQL);
    console.log('✓ Migrations table ready');
  } catch (error) {
    console.error('Failed to create migrations table:', error);
    throw error;
  }
}

/**
 * Get list of applied migrations
 */
async function getAppliedMigrations() {
  try {
    const result = await query('SELECT migration_name FROM schema_migrations ORDER BY id');
    return result.rows.map(row => row.migration_name);
  } catch (error) {
    console.error('Failed to get applied migrations:', error);
    return [];
  }
}

/**
 * Mark migration as applied
 */
async function recordMigration(migrationName) {
  await query(
    'INSERT INTO schema_migrations (migration_name) VALUES ($1) ON CONFLICT (migration_name) DO NOTHING',
    [migrationName]
  );
}

/**
 * Run a single migration file
 */
async function runMigration(migrationFile, migrationPath) {
  console.log(`  Running migration: ${migrationFile}`);
  
  try {
    const sql = await fs.readFile(migrationPath, 'utf-8');
    
    // Split by semicolons and filter out empty statements
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    // Execute each statement
    for (const statement of statements) {
      if (statement) {
        await query(statement);
      }
    }
    
    await recordMigration(migrationFile);
    console.log(`  ✓ Migration completed: ${migrationFile}`);
    return true;
  } catch (error) {
    console.error(`  ✗ Migration failed: ${migrationFile}`, error);
    throw error;
  }
}

/**
 * Run all pending migrations
 */
export async function runMigrations() {
  console.log('\n' + '='.repeat(60));
  console.log('🔄 Running database migrations...');
  console.log('='.repeat(60));
  
  try {
    // Ensure migrations table exists
    await createMigrationsTable();
    
    // Get list of applied migrations
    const appliedMigrations = await getAppliedMigrations();
    console.log(`Applied migrations: ${appliedMigrations.length}`);
    
    // Read migration files from directory
    let files;
    try {
      files = await fs.readdir(MIGRATIONS_DIR);
    } catch (error) {
      console.log('⚠ Migrations directory not found, skipping migrations');
      console.log('='.repeat(60) + '\n');
      return;
    }
    
    // Filter and sort SQL files
    const migrationFiles = files
      .filter(f => f.endsWith('.sql'))
      .sort();
    
    console.log(`Available migrations: ${migrationFiles.length}`);
    
    // Run pending migrations
    const pendingMigrations = migrationFiles.filter(
      f => !appliedMigrations.includes(f)
    );
    
    if (pendingMigrations.length === 0) {
      console.log('✓ No pending migrations');
    } else {
      console.log(`\nPending migrations: ${pendingMigrations.length}`);
      
      for (const migrationFile of pendingMigrations) {
        const migrationPath = path.join(MIGRATIONS_DIR, migrationFile);
        await runMigration(migrationFile, migrationPath);
      }
      
      console.log(`\n✓ All ${pendingMigrations.length} migrations completed successfully`);
    }
    
    console.log('='.repeat(60) + '\n');
  } catch (error) {
    console.error('Migration failed:', error);
    console.log('='.repeat(60) + '\n');
    throw error;
  }
}

export default { runMigrations };
