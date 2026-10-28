import * as crypto from 'node:crypto';
import { randomBytes } from 'node:crypto';
import { Pool } from 'pg';

type Argon2Native = (algorithm: 'argon2id', parameters: { message: string; nonce: Buffer; parallelism: number; memory: number; passes: number; tagLength: number }, callback: (error: Error | null, derivedKey: Buffer) => void) => void;
const argon2 = (crypto as unknown as { argon2?: Argon2Native }).argon2;

async function main(): Promise<void> {
  const email = (process.env.STORE_ADMIN_EMAIL || process.env.DIGITAL_STORE_ADMIN_EMAIL)?.trim().toLowerCase();
  const password = process.env.STORE_ADMIN_PASSWORD || process.env.DIGITAL_STORE_ADMIN_PASSWORD;
  if (!email || !password || password.length < 12 || password.length > 128) throw new Error('Informe STORE_ADMIN_EMAIL e uma STORE_ADMIN_PASSWORD de 12 a 128 caracteres.');
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL é obrigatória.');
  if (!argon2) throw new Error('Argon2id requer Node.js 24.7 ou superior.');
  const salt = randomBytes(16).toString('hex');
  const digest = await new Promise<Buffer>((resolve, reject) => {
    argon2('argon2id', { message: password, nonce: Buffer.from(salt, 'hex'), parallelism: 1, memory: 65_536, passes: 3, tagLength: 32 },
      (error, derivedKey) => error ? reject(error) : resolve(derivedKey));
  });
  const pool = new Pool({ connectionString, max: 1, application_name: 'digital-store-admin-provision' });
  try {
    await pool.query('BEGIN');
    const user = await pool.query<{ id: string }>(
      `INSERT INTO users(email,password_salt,password_hash,role,status,tenant_id)
       VALUES($1,$2,$3,'admin','ACTIVE','crystalforn')
       ON CONFLICT(email) DO UPDATE SET password_salt=EXCLUDED.password_salt,password_hash=EXCLUDED.password_hash,
         role='admin',status='ACTIVE',tenant_id='crystalforn'
       WHERE users.auth_user_id IS NULL OR users.auth_user_id LIKE 'store-admin:%'
       RETURNING id`, [email, `argon2id$${salt}`, digest.toString('hex')]);
    if (!user.rows[0]) throw new Error('O e-mail informado já está vinculado a uma identidade central.');
    const storeUserId = user.rows[0].id;
    await pool.query('INSERT INTO wallet_accounts(user_id,balance_cents) VALUES($1,0) ON CONFLICT(user_id) DO NOTHING', [storeUserId]);
    await pool.query(
      `INSERT INTO dashboard_users(auth_user_id,email,display_name,tenant_id,roles,status,password_salt,password_hash,store_user_id)
       VALUES($1,$2,'Administrador Crystalforn','crystalforn',ARRAY['store_admin']::text[],'ACTIVE',$3,$4,$5)
       ON CONFLICT(store_user_id) DO UPDATE SET auth_user_id=EXCLUDED.auth_user_id,email=EXCLUDED.email,
         tenant_id=EXCLUDED.tenant_id,roles=EXCLUDED.roles,status=EXCLUDED.status,
         password_salt=EXCLUDED.password_salt,password_hash=EXCLUDED.password_hash,updated_at=now()`,
      [`store-admin:${storeUserId}`, email, `argon2id$${salt}`, digest.toString('hex'), storeUserId]);
    await pool.query('COMMIT');
  } catch (error) { await pool.query('ROLLBACK'); throw error; }
  finally { await pool.end(); }
  process.stdout.write('Administrador provisionado.\n');
}

void main().catch(() => { process.stderr.write('Falha ao provisionar administrador. Verifique o ambiente e o banco.\n'); process.exitCode = 1; });
