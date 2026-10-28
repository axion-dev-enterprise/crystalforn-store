import * as crypto from 'node:crypto';
import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { ConflictException, HttpException, HttpStatus, Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import type { AuthenticatedUser, StoreRole } from '../../common/auth.types';
import { requireApprovedStoreAuthentication } from './auth-governance-status';

const SESSION_COOKIE = 'digital_store_session';
const SESSION_TTL_HOURS = 12;
const MAX_ATTEMPTS = 6;
type Argon2Native = (algorithm: 'argon2id', parameters: { message: string; nonce: Buffer; parallelism: number; memory: number; passes: number; tagLength: number }, callback: (error: Error | null, derivedKey: Buffer) => void) => void;
const argon2 = (crypto as unknown as { argon2?: Argon2Native }).argon2;

function normalizeEmail(value: string): string { return value.trim().toLowerCase(); }
function sessionDigest(token: string): Buffer {
  const pepper = process.env.SESSION_PEPPER;
  if (!pepper || !/^[a-f\d]{64}$/i.test(pepper)) throw new Error('Sessões indisponíveis por falta de configuração segura.');
  return createHash('sha256').update(Buffer.from(pepper, 'hex')).update(token).digest();
}
async function legacyScryptDigest(password: string, salt: string): Promise<Buffer> {
  const result = await new Promise<Buffer>((resolve, reject) => {
    scryptCallback(password, Buffer.from(salt, 'hex'), 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 },
      (error, derivedKey) => error ? reject(error) : resolve(derivedKey));
  });
  return result;
}
async function passwordDigest(password: string, salt: string): Promise<Buffer> {
  if (!argon2) throw new Error('Argon2id requer Node.js 24.7 ou superior.');
  return new Promise<Buffer>((resolve, reject) => {
    argon2('argon2id', { message: password, nonce: Buffer.from(salt, 'hex'), parallelism: 1, memory: 65_536, passes: 3, tagLength: 32 },
      (error, derivedKey) => error ? reject(error) : resolve(derivedKey));
  });
}

@Injectable()
export class AuthService {
  constructor(private readonly db: DatabaseService) {}

  centralLoginUrl(client = 'crystalforn'): string {
    requireApprovedStoreAuthentication();
    if (!['crystalforn', 'crystalforn-admin'].includes(client)) throw new UnauthorizedException('Aplicação de autenticação inválida.');
    const base = new URL(process.env.STORE_AUTH_CENTER_URL!);
    if (base.protocol !== 'https:' || base.username || base.password || base.search || base.hash) {
      throw new ServiceUnavailableException('URL do Auth Center inválida.');
    }
    return `${base.origin}/api/auth/google/login?client=${client}`;
  }

  async consumeCentralCode(code: string, response: { setHeader: (name: string, value: string) => void }): Promise<void> {
    requireApprovedStoreAuthentication();
    if (!/^[A-Za-z0-9_-]{40,64}$/.test(code)) throw new UnauthorizedException('Código de acesso inválido ou expirado.');
    const center = new URL(process.env.STORE_AUTH_CENTER_URL!);
    if (center.protocol !== 'https:' || center.username || center.password || center.search || center.hash) {
      throw new ServiceUnavailableException('URL do Auth Center inválida.');
    }
    let exchange: Response;
    try {
      exchange = await fetch(`${center.origin}/api/store/exchange`, {
        method: 'POST', headers: { 'content-type': 'application/json', 'x-crystalforn-auth-secret': process.env.STORE_AUTH_CLIENT_SECRET! },
        body: JSON.stringify({ code }), signal: AbortSignal.timeout(5000), cache: 'no-store',
      });
    } catch { throw new ServiceUnavailableException('Auth Center temporariamente indisponível.'); }
    if (exchange.status === 401) throw new UnauthorizedException('Código de acesso inválido ou expirado.');
    if (!exchange.ok) throw new ServiceUnavailableException('Auth Center não pôde confirmar a identidade.');
    const payload = await exchange.json().catch(() => null) as { authenticated?: boolean; user?: { id?: string; email?: string; name?: string; tenant?: string; roles?: string[] } } | null;
    const central = payload?.user;
    const centralRole = central?.roles?.length === 1 ? central.roles[0] : '';
    if (!payload?.authenticated || !central?.id || !central.email || central.tenant !== 'crystalforn'
      || !['store_customer', 'store_admin'].includes(centralRole)) {
      throw new UnauthorizedException('A identidade central não tem papel autorizado na Crystalforn.');
    }
    const email = normalizeEmail(central.email);
    const storeRole: StoreRole = centralRole === 'store_admin' ? 'admin' : 'client';
    const linked = await this.db.transaction(async (client) => {
      await client.query(
        `INSERT INTO users(email,password_salt,password_hash,role,status,auth_user_id,tenant_id)
         VALUES($1,'central-auth','central-auth',$3,'ACTIVE',$2,'crystalforn')
         ON CONFLICT(auth_user_id) DO NOTHING`, [email, central.id, storeRole]);
      const row = await client.query<{ id: string; email: string; role: StoreRole; auth_user_id: string; tenant_id: string }>(
        `SELECT id,email,role,auth_user_id,tenant_id FROM users WHERE auth_user_id=$1 FOR UPDATE`, [central.id]);
      if (!row.rows[0] || row.rows[0].role !== storeRole || row.rows[0].tenant_id !== 'crystalforn' || row.rows[0].email !== email) {
        throw new UnauthorizedException('A identidade local não corresponde ao cadastro central.');
      }
      await client.query(
        `INSERT INTO dashboard_users(auth_user_id,email,display_name,tenant_id,roles,status,store_user_id)
         VALUES($1,$2,$3,'crystalforn',ARRAY[$4]::text[],'ACTIVE',$5)
         ON CONFLICT(auth_user_id) DO NOTHING`,
        [central.id, email, central.name || null, centralRole, row.rows[0].id]);
      if (storeRole === 'client') await client.query('INSERT INTO wallet_accounts(user_id,balance_cents) VALUES($1,0) ON CONFLICT(user_id) DO NOTHING', [row.rows[0].id]);
      return row.rows[0];
    });
    await this.createSession(linked.id, response);
  }

  async loginAdmin(email: string, password: string, remoteAddress: string, response: { setHeader: (name: string, value: string) => void }): Promise<{ id: string; email: string }> {
    if (!argon2) throw new ServiceUnavailableException('Login administrativo indisponível: Argon2id requer Node.js 24.7 ou superior.');
    const normalized = normalizeEmail(email);
    const bucket = await this.enforceRateLimit(normalized, remoteAddress);
    const result = await this.db.query<{
      id: string; email: string; password_salt: string; password_hash: string; status: string;
      role: StoreRole; auth_user_id: string | null; tenant_id: string | null;
      dashboard_status: string; dashboard_tenant: string; dashboard_roles: string[]; dashboard_auth_user_id: string;
    }>(
      `SELECT u.id,u.email,u.password_salt,u.password_hash,u.status,u.role,u.auth_user_id,u.tenant_id,
              d.status AS dashboard_status,d.tenant_id AS dashboard_tenant,d.roles AS dashboard_roles,d.auth_user_id AS dashboard_auth_user_id
       FROM dashboard_users d JOIN users u ON u.id=d.store_user_id
       WHERE d.email=$1 AND d.tenant_id='crystalforn' AND d.roles @> ARRAY['store_admin']::text[]`, [normalized]);
    const row = result.rows[0];
    const storedSalt = row?.password_salt ?? '';
    const isArgon2 = storedSalt.startsWith('argon2id$');
    const salt = isArgon2 ? storedSalt.slice('argon2id$'.length) : storedSalt;
    const actual = isArgon2 || !row
      ? await passwordDigest(password, /^[a-f\d]{32}$/i.test(salt) ? salt : '00'.repeat(16))
      : await legacyScryptDigest(password, /^[a-f\d]{32}$/i.test(salt) ? salt : '00'.repeat(16));
    const expected = Buffer.from(row?.password_hash ?? (isArgon2 ? '00'.repeat(32) : '00'.repeat(64)), 'hex');
    const authorized = row && row.status === 'ACTIVE' && row.dashboard_status === 'ACTIVE'
      && row.role === 'admin' && row.auth_user_id === null && row.tenant_id === 'crystalforn'
      && row.dashboard_tenant === 'crystalforn' && row.dashboard_roles.length === 1
      && row.dashboard_roles[0] === 'store_admin' && row.dashboard_auth_user_id === `store-admin:${row.id}`;
    if (!row || !authorized || actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
      throw new UnauthorizedException('E-mail ou senha inválidos.');
    }
    if (!isArgon2) {
      const newSalt = randomBytes(16).toString('hex');
      const newHash = await passwordDigest(password, newSalt);
      await this.db.transaction(async (client) => {
        await client.query(
          `UPDATE users SET password_salt=$2,password_hash=$3 WHERE id=$1 AND password_salt=$4 AND password_hash=$5`,
          [row.id, `argon2id$${newSalt}`, newHash.toString('hex'), storedSalt, row.password_hash]);
        await client.query(
          `UPDATE dashboard_users SET password_salt=$2,password_hash=$3,updated_at=now() WHERE store_user_id=$1`,
          [row.id, `argon2id$${newSalt}`, newHash.toString('hex')]);
      });
    }
    await this.db.query('DELETE FROM auth_attempts WHERE bucket_hash=$1', [bucket]);
    await this.createSession(row.id, response);
    return { id: row.id, email: row.email };
  }

  private async enforceRateLimit(email: string, remoteAddress: string): Promise<Buffer> {
    const bucket = createHash('sha256').update(`${normalizeEmail(email)}\n${remoteAddress}`).digest();
    await this.db.transaction(async (client) => {
      await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [bucket.toString('hex')]);
      const result = await client.query<{ count: string }>(
        'SELECT count(*)::text AS count FROM auth_attempts WHERE bucket_hash=$1 AND attempted_at > now() - interval \'15 minutes\'', [bucket]);
      if (Number(result.rows[0]?.count ?? 0) >= MAX_ATTEMPTS) {
        throw new HttpException('Muitas tentativas. Aguarde 15 minutos.', HttpStatus.TOO_MANY_REQUESTS);
      }
      await client.query('INSERT INTO auth_attempts(bucket_hash) VALUES($1)', [bucket]);
      await client.query('DELETE FROM auth_attempts WHERE attempted_at < now() - interval \'1 day\'');
    });
    return bucket;
  }

  async register(email: string, password: string, remoteAddress: string, response: { setHeader: (name: string, value: string) => void }): Promise<{ id: string; email: string }> {
    requireApprovedStoreAuthentication();
    const normalized = normalizeEmail(email);
    const bucket = await this.enforceRateLimit(normalized, remoteAddress);
    const salt = randomBytes(16).toString('hex');
    const hash = await passwordDigest(password, salt);
    try {
      const result = await this.db.transaction(async (client) => {
        const user = await client.query<{ id: string; email: string }>(
          `INSERT INTO users(email,password_salt,password_hash,role) VALUES($1,$2,$3,'client') RETURNING id,email`, [normalized, `argon2id$${salt}`, hash.toString('hex')]);
        await client.query('INSERT INTO wallet_accounts(user_id,balance_cents) VALUES($1,0)', [user.rows[0].id]);
        return user.rows[0];
      });
      await this.db.query('DELETE FROM auth_attempts WHERE bucket_hash=$1', [bucket]);
      await this.createSession(result.id, response);
      return result;
    } catch (error) {
      if ((error as { code?: string }).code === '23505') throw new ConflictException('Este e-mail já está cadastrado.');
      throw error;
    }
  }

  async login(email: string, password: string, remoteAddress: string, response: { setHeader: (name: string, value: string) => void }): Promise<{ id: string; email: string }> {
    requireApprovedStoreAuthentication();
    const bucket = await this.enforceRateLimit(email, remoteAddress);
    const result = await this.db.query<{ id: string; email: string; password_salt: string; password_hash: string; status: string }>(
      'SELECT id,email,password_salt,password_hash,status FROM users WHERE email=$1', [normalizeEmail(email)]);
    const row = result.rows[0];
    const storedSalt = row?.password_salt ?? '';
    const isArgon2 = storedSalt.startsWith('argon2id$');
    const salt = isArgon2 ? storedSalt.slice('argon2id$'.length) : storedSalt;
    const actual = isArgon2 || !row
      ? await passwordDigest(password, /^[a-f\d]{32}$/i.test(salt) ? salt : '00'.repeat(16))
      : await legacyScryptDigest(password, /^[a-f\d]{32}$/i.test(salt) ? salt : '00'.repeat(16));
    const expected = Buffer.from(row?.password_hash ?? (isArgon2 ? '00'.repeat(32) : '00'.repeat(64)), 'hex');
    if (!row || row.status !== 'ACTIVE' || actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
      throw new UnauthorizedException('E-mail ou senha inválidos.');
    }
    if (!isArgon2) {
      const newSalt = randomBytes(16).toString('hex');
      const newHash = await passwordDigest(password, newSalt);
      await this.db.query('UPDATE users SET password_salt=$2,password_hash=$3 WHERE id=$1 AND password_salt=$4 AND password_hash=$5',
        [row.id, `argon2id$${newSalt}`, newHash.toString('hex'), storedSalt, row.password_hash]);
    }
    await this.db.query('DELETE FROM auth_attempts WHERE bucket_hash=$1', [bucket]);
    await this.createSession(row.id, response);
    return { id: row.id, email: row.email };
  }

  private async createSession(userId: string, response: { setHeader: (name: string, value: string) => void }): Promise<void> {
    const token = randomBytes(32).toString('base64url');
    const digest = sessionDigest(token);
    await this.db.query('INSERT INTO sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+($3::int * interval \'1 hour\'))', [digest, userId, SESSION_TTL_HOURS]);
    const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
    response.setHeader('Set-Cookie', `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_TTL_HOURS * 3600}${secure}`);
  }

  async userFromCookie(cookieHeader?: string): Promise<AuthenticatedUser | null> {
    const token = cookieHeader?.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${SESSION_COOKIE}=`))?.slice(SESSION_COOKIE.length + 1);
    if (!token || token.length > 128) return null;
    const digest = sessionDigest(token);
    const result = await this.db.query<{
      id: string; email: string; role: StoreRole; auth_user_id: string | null; tenant_id: string | null;
      dashboard_auth_user_id: string | null; dashboard_tenant: string | null; dashboard_roles: string[] | null; dashboard_status: string | null;
    }>(
      `SELECT u.id,u.email,u.role,u.auth_user_id,u.tenant_id,d.auth_user_id AS dashboard_auth_user_id,
              d.tenant_id AS dashboard_tenant,d.roles AS dashboard_roles,d.status AS dashboard_status
       FROM sessions s JOIN users u ON u.id=s.user_id LEFT JOIN dashboard_users d ON d.store_user_id=u.id
       WHERE s.token_hash=$1 AND s.expires_at > now() AND u.status='ACTIVE'`, [digest]);
    const user = result.rows[0];
    if (!user) return null;
    if (user.role === 'admin' && user.auth_user_id === null && user.tenant_id === 'crystalforn'
      && user.dashboard_auth_user_id === `store-admin:${user.id}` && user.dashboard_tenant === 'crystalforn'
      && user.dashboard_status === 'ACTIVE' && user.dashboard_roles?.length === 1 && user.dashboard_roles[0] === 'store_admin') {
      return { id: user.id, email: user.email, role: 'admin' };
    }
    requireApprovedStoreAuthentication();
    if (!['client', 'admin'].includes(user.role) || !user.auth_user_id || user.tenant_id !== 'crystalforn') return null;
    const center = new URL(process.env.STORE_AUTH_CENTER_URL!);
    if (center.protocol !== 'https:' || center.username || center.password || center.search || center.hash) {
      throw new ServiceUnavailableException('URL do Auth Center inválida.');
    }
    let verification: Response;
    try {
      verification = await fetch(`${center.origin}/api/store/introspect`, {
        method: 'POST', headers: { 'content-type': 'application/json', 'x-crystalforn-auth-secret': process.env.STORE_AUTH_CLIENT_SECRET! },
        body: JSON.stringify({ authUserId: user.auth_user_id }), signal: AbortSignal.timeout(3000), cache: 'no-store',
      });
    } catch { throw new ServiceUnavailableException('Não foi possível validar a identidade central.'); }
    if (verification.status === 401) return null;
    if (!verification.ok) throw new ServiceUnavailableException('Validação da identidade central indisponível.');
    const identity = await verification.json().catch(() => null) as { authenticated?: boolean; user?: { id?: string; email?: string; tenant?: string; roles?: string[] } } | null;
    const expectedCentralRole = user.role === 'admin' ? 'store_admin' : 'store_customer';
    if (!identity?.authenticated || identity.user?.id !== user.auth_user_id || normalizeEmail(identity.user.email || '') !== user.email
      || identity.user.tenant !== 'crystalforn' || !Array.isArray(identity.user.roles)
      || identity.user.roles.length !== 1 || identity.user.roles[0] !== expectedCentralRole) return null;
    return { id: user.id, email: user.email, role: user.role };
  }

  async logout(cookieHeader?: string, response?: { setHeader: (name: string, value: string) => void }): Promise<void> {
    const token = cookieHeader?.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${SESSION_COOKIE}=`))?.slice(SESSION_COOKIE.length + 1);
    if (token) await this.db.query('DELETE FROM sessions WHERE token_hash=$1', [sessionDigest(token)]);
    response?.setHeader('Set-Cookie', `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`);
  }
}
