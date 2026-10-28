import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Pool } from 'pg';

async function migrate(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL é obrigatória para migrações.');
  const pool = new Pool({ connectionString, max: 1, connectionTimeoutMillis: 5000, application_name: 'digital-store-migrations' });
  try {
    const client = await pool.connect();
    let migrationLockHeld = false;
    try {
      await client.query("SELECT pg_advisory_lock(hashtext('digital-accounts-store-schema-migrations'))");
      migrationLockHeld = true;
      await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations(name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`);
      const directory = join(__dirname, '../../../sql');
      const files = (await readdir(directory)).filter((name) => /^\d+_[a-z0-9_-]+\.sql$/.test(name)).sort();
      for (const name of files) {
        const existing = await client.query('SELECT 1 FROM schema_migrations WHERE name=$1', [name]);
        if (existing.rowCount) continue;
        const sql = await readFile(join(directory, name), 'utf8');
        await client.query('BEGIN');
        try {
          await client.query(sql);
          await client.query('INSERT INTO schema_migrations(name) VALUES($1)', [name]);
          await client.query('COMMIT');
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        }
      }
    } finally {
      if (migrationLockHeld) {
        await client.query("SELECT pg_advisory_unlock(hashtext('digital-accounts-store-schema-migrations'))").catch(() => undefined);
      }
      client.release();
    }
  } finally { await pool.end(); }
}

void migrate().catch(() => { process.stderr.write('Falha ao aplicar migrações da loja. Revise a disponibilidade e os privilégios do banco.\n'); process.exitCode = 1; });
