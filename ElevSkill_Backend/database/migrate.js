import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from '../src/config/environment.js';
import { closePool, getPool } from '../src/config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function ensureDatabaseExists() {
  const originalDb = env.sql.database;
  env.sql.database = 'master';
  try {
    const pool = await getPool();
    await pool
      .request()
      .query(`IF DB_ID(N'${originalDb.replace(/'/g, "''")}') IS NULL CREATE DATABASE [${originalDb}];`);
    console.log(`Database '${originalDb}' verified/created.`);
  } finally {
    await closePool();
    env.sql.database = originalDb;
  }
}

async function runMigrations() {
  await ensureDatabaseExists();
  const pool = await getPool();

  await pool.request().query(`
    IF OBJECT_ID(N'dbo.SchemaMigrations', N'U') IS NULL
    BEGIN
      CREATE TABLE dbo.SchemaMigrations (
        MigrationId INT IDENTITY(1,1) PRIMARY KEY,
        MigrationName NVARCHAR(255) NOT NULL UNIQUE,
        AppliedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
      );
    END
  `);

  const migrationsDir = path.join(__dirname, 'migrations');
  const files = (await fs.readdir(migrationsDir))
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const existing = await pool
      .request()
      .input('name', file)
      .query('SELECT 1 FROM dbo.SchemaMigrations WHERE MigrationName = @name');

    if (existing.recordset.length > 0) {
      console.log(`Skipping already applied migration: ${file}`);
      continue;
    }

    const sqlText = await fs.readFile(path.join(migrationsDir, file), 'utf8');
    const batches = sqlText
      .split(/^\s*GO\s*$/gim)
      .map((b) => b.trim())
      .filter(Boolean);

    for (const batch of batches) {
      await pool.request().batch(batch);
    }

    await pool
      .request()
      .input('name', file)
      .query('INSERT INTO dbo.SchemaMigrations (MigrationName) VALUES (@name)');

    console.log(`Applied migration: ${file}`);
  }
}

runMigrations()
  .then(async () => {
    await closePool();
    console.log('All migrations completed successfully.');
    process.exit(0);
  })
  .catch(async (err) => {
    console.error('Migration failed:', err?.message || err);
    await closePool();
    process.exit(1);
  });
