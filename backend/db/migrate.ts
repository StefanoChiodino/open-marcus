import Database from 'better-sqlite3';
import { CREATE_TABLES_SQL, DROP_TABLES_SQL, CREATE_STOIC_CONTENT_SQL, CREATE_SETTINGS_TABLE_SQL } from './schema.js';

export interface MigrationRecord {
  id: number;
  name: string;
  applied_at: string;
}

export class MigrationRunner {
  private db: Database.Database;
  private migrations: { name: string; sql: string }[];

  constructor(db: Database.Database) {
    this.db = db;
    this.migrations = [
      {
        name: '001_initial_schema',
        sql: CREATE_TABLES_SQL,
      },
      {
        name: '002_stoic_content',
        sql: CREATE_STOIC_CONTENT_SQL,
      },
      {
        name: '003_settings_table',
        sql: CREATE_SETTINGS_TABLE_SQL,
      },
    ];
  }

  /**
   * Run all pending migrations
   */
  run(): void {
    this.ensureMigrationsTable();
    const applied = this.getAppliedMigrations();
    const appliedNames = new Set(applied.map((m) => m.name));

    for (const migration of this.migrations) {
      if (!appliedNames.has(migration.name)) {
        console.log(`Applying migration: ${migration.name}`);
        this.db.exec(migration.sql);
        this.recordMigration(migration.name);
        console.log(`Migration ${migration.name} applied successfully`);
      }
    }
  }

  /**
   * Ensure the migrations tracking table exists
   */
  private ensureMigrationsTable(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        applied_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
  }

  /**
   * Get all applied migrations
   */
  private getAppliedMigrations(): MigrationRecord[] {
    const stmt = this.db.prepare('SELECT * FROM _migrations ORDER BY id');
    return stmt.all() as MigrationRecord[];
  }

  /**
   * Record a migration as applied
   */
  private recordMigration(name: string): void {
    const stmt = this.db.prepare('INSERT INTO _migrations (name) VALUES (?)');
    stmt.run(name);
  }

  /**
   * Reset database by dropping all tables
   * WARNING: This will delete all data
   */
  reset(): void {
    console.warn('Resetting database - all data will be lost!');
    this.db.exec(DROP_TABLES_SQL);
    this.db.exec('DELETE FROM _migrations');
  }

  /**
   * Get migration status
   */
  status(): { name: string; applied: boolean }[] {
    this.ensureMigrationsTable();
    const applied = this.getAppliedMigrations();
    const appliedNames = new Set(applied.map((m) => m.name));

    return this.migrations.map((m) => ({
      name: m.name,
      applied: appliedNames.has(m.name),
    }));
  }
}
