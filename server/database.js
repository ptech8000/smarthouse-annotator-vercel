const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const { hashPassword, generateToken } = require('./security');

function resolveDatabaseUrl() {
  const candidates = [
    process.env.DATABASE_URL,
    process.env.POSTGRES_URL,
    process.env.POSTGRES_PRISMA_URL,
    process.env.POSTGRES_URL_NON_POOLING,
    process.env.NEON_DATABASE_URL,
    process.env.STORAGE_URL
  ];
  for (const raw of candidates) {
    if (typeof raw === 'string') {
      const trimmed = raw.trim();
      if (trimmed && !trimmed.startsWith('<') && /^postgres(ql)?:\/\//i.test(trimmed)) {
        return trimmed;
      }
    }
  }
  return '';
}

const DATABASE_URL = resolveDatabaseUrl();
const IS_POSTGRES = Boolean(DATABASE_URL);

// Schema-level isolation for PostgreSQL: defaults to 'annotator_v2' on Vercel so data can never mix with 'public'.
const RAW_SCHEMA = typeof process.env.PG_SCHEMA === 'string' ? process.env.PG_SCHEMA.trim() : '';
const PG_SCHEMA = RAW_SCHEMA || (process.env.VERCEL ? 'annotator_v2' : 'public');
if (IS_POSTGRES && !/^[a-z_][a-z0-9_]{0,40}$/.test(PG_SCHEMA)) {
  throw new Error(`Invalid PG_SCHEMA "${PG_SCHEMA}". Must match /^[a-z_][a-z0-9_]{0,40}$/.`);
}

function tbl(name) {
  return IS_POSTGRES && PG_SCHEMA !== 'public' ? `"${PG_SCHEMA}".${name}` : name;
}

const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : process.env.VERCEL
    ? '/tmp/smarthouse-data'
    : path.join(__dirname, 'data');

let sqliteDb = null;
let pgPool = null;
let sqliteTxChain = Promise.resolve();
const sqliteStmtCache = new Map();

function convertPlaceholders(sql) {
  let idx = 0;
  return sql.replace(/\?/g, () => `$${++idx}`);
}

function createSqliteExecutor(connection) {
  const prepare = sql => {
    let stmt = sqliteStmtCache.get(sql);
    if (!stmt) {
      stmt = connection.prepare(sql);
      sqliteStmtCache.set(sql, stmt);
    }
    return stmt;
  };
  return {
    async all(sql, params = []) {
      return prepare(sql).all(...params);
    },
    async get(sql, params = []) {
      return prepare(sql).get(...params) || null;
    },
    async run(sql, params = []) {
      const info = prepare(sql).run(...params);
      return { changes: Number(info?.changes || 0) };
    }
  };
}

function createPgExecutor(querier) {
  return {
    async all(sql, params = []) {
      const res = await querier.query(convertPlaceholders(sql), params);
      return res.rows || [];
    },
    async get(sql, params = []) {
      const res = await querier.query(convertPlaceholders(sql), params);
      return res.rows && res.rows[0] ? res.rows[0] : null;
    },
    async run(sql, params = []) {
      const res = await querier.query(convertPlaceholders(sql), params);
      return { changes: Number(res.rowCount || 0) };
    }
  };
}

let rootExec = null;
let initPromise = null;

function buildSchemaStatements(isPg) {
  const autoPk = isPg ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT';

  return [
    `CREATE TABLE IF NOT EXISTS ${tbl('sessions')} (
      id TEXT PRIMARY KEY,
      config_hash TEXT NOT NULL,
      config_snapshot TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      timezone TEXT NOT NULL DEFAULT 'UTC',
      started_at TEXT NOT NULL,
      ended_at TEXT,
      strict_session_lock INTEGER NOT NULL DEFAULT 0,
      environment_id TEXT DEFAULT 'default-smart-house',
      environment_name TEXT DEFAULT 'Default Smart House'
    )`,
    `CREATE TABLE IF NOT EXISTS ${tbl('annotations')} (
      id ${autoPk},
      client_uuid TEXT UNIQUE NOT NULL,
      session_id TEXT NOT NULL,
      participant TEXT NOT NULL,
      seq INTEGER NOT NULL,
      timestamp_started TEXT NOT NULL,
      timestamp_submitted TEXT NOT NULL,
      timestamp_received TEXT NOT NULL,
      location_id INTEGER NOT NULL,
      location TEXT NOT NULL,
      activity_id INTEGER NOT NULL,
      activity TEXT NOT NULL,
      interaction TEXT NOT NULL,
      other_person TEXT,
      edited INTEGER NOT NULL DEFAULT 0,
      config_version TEXT NOT NULL,
      FOREIGN KEY(session_id) REFERENCES ${tbl('sessions')}(id) ON DELETE CASCADE
    )`,
    `CREATE INDEX IF NOT EXISTS idx_annotations_session_participant ON ${tbl('annotations')}(session_id, participant)`,
    `CREATE INDEX IF NOT EXISTS idx_annotations_ts ON ${tbl('annotations')}(timestamp_submitted)`,
    `CREATE TABLE IF NOT EXISTS ${tbl('collaborator_locks')} (
      session_id TEXT NOT NULL,
      taken_person TEXT NOT NULL,
      taken_by TEXT NOT NULL,
      activity TEXT,
      locked_at TEXT NOT NULL,
      PRIMARY KEY (session_id, taken_person),
      FOREIGN KEY(session_id) REFERENCES ${tbl('sessions')}(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS ${tbl('admin_users')} (
      username TEXT PRIMARY KEY,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      must_change_password INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS ${tbl('admin_sessions')} (
      token_hash TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(username) REFERENCES ${tbl('admin_users')}(username) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS ${tbl('participant_tokens')} (
      token TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      participant TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(session_id, participant),
      FOREIGN KEY(session_id) REFERENCES ${tbl('sessions')}(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS ${tbl('environments')} (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      config_hash TEXT NOT NULL,
      config_snapshot TEXT NOT NULL,
      is_default INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`
  ];
}

async function initializeDatabase() {
  if (IS_POSTGRES) {
    const isLocalPg = /@(localhost|127\.0\.0\.1)(:|\/)/i.test(DATABASE_URL);
    const disableSsl = /[?&]sslmode=disable/i.test(DATABASE_URL);
    pgPool = new Pool({
      connectionString: DATABASE_URL,
      ssl: disableSsl || isLocalPg ? false : { rejectUnauthorized: false },
      max: process.env.VERCEL ? 5 : 10,
      idleTimeoutMillis: 30000
    });
    rootExec = createPgExecutor(pgPool);

    if (PG_SCHEMA !== 'public') {
      await pgPool.query(`CREATE SCHEMA IF NOT EXISTS "${PG_SCHEMA}"`);
    }

    for (const ddl of buildSchemaStatements(true)) {
      await pgPool.query(ddl);
    }

    const pgMigrations = [
      `ALTER TABLE ${tbl('sessions')} ADD COLUMN IF NOT EXISTS strict_session_lock INTEGER NOT NULL DEFAULT 0`,
      `ALTER TABLE ${tbl('sessions')} ADD COLUMN IF NOT EXISTS environment_id TEXT DEFAULT 'default-smart-house'`,
      `ALTER TABLE ${tbl('sessions')} ADD COLUMN IF NOT EXISTS environment_name TEXT DEFAULT 'Default Smart House'`
    ];
    for (const sql of pgMigrations) {
      await pgPool.query(sql);
    }
    console.log(`[Database] Connected to PostgreSQL (schema "${PG_SCHEMA}").`);
  } else {
    const { DatabaseSync } = require('node:sqlite');
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const dbPath = path.join(DATA_DIR, 'smart_house_annotator.db');
    sqliteDb = new DatabaseSync(dbPath);
    sqliteDb.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
    rootExec = createSqliteExecutor(sqliteDb);

    for (const ddl of buildSchemaStatements(false)) {
      sqliteDb.exec(ddl);
    }

    const sqliteMigrations = [
      `ALTER TABLE ${tbl('sessions')} ADD COLUMN strict_session_lock INTEGER NOT NULL DEFAULT 0`,
      `ALTER TABLE ${tbl('sessions')} ADD COLUMN environment_id TEXT DEFAULT 'default-smart-house'`,
      `ALTER TABLE ${tbl('sessions')} ADD COLUMN environment_name TEXT DEFAULT 'Default Smart House'`
    ];
    for (const sql of sqliteMigrations) {
      try {
        sqliteDb.exec(sql);
      } catch {
        // Column already exists
      }
    }
    console.log(`[Database] Using local SQLite database at ${dbPath}`);
  }

  // Seed default researcher admin account on first boot if none exists
  const adminCountRow = await rootExec.get(`SELECT COUNT(*) AS cnt FROM ${tbl('admin_users')}`);
  const adminCount = Number(adminCountRow?.cnt || 0);
  if (adminCount === 0) {
    const defaultUsername = (process.env.ADMIN_USERNAME || 'admin').trim();
    const defaultPassword = process.env.ADMIN_PASSWORD || 'SmartHouse@2026';
    const { hash, salt } = hashPassword(defaultPassword);
    await rootExec.run(
      `INSERT INTO ${tbl('admin_users')} (username, password_hash, salt, must_change_password, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT (username) DO NOTHING`,
      [
        defaultUsername,
        hash,
        salt,
        process.env.ADMIN_PASSWORD ? 0 : 1,
        new Date().toISOString()
      ]
    );
    console.log(
      `[Auth] Seeded initial admin user "${defaultUsername}".${
        process.env.ADMIN_PASSWORD ? '' : ' Change default password after first login.'
      }`
    );
  }
}

async function ensureReady() {
  if (!initPromise) {
    initPromise = initializeDatabase().catch(err => {
      initPromise = null;
      throw err;
    });
  }
  await initPromise;
}

async function inTransaction(fn) {
  await ensureReady();
  if (IS_POSTGRES) {
    const client = await pgPool.connect();
    const txExec = createPgExecutor(client);
    try {
      await client.query('BEGIN');
      const result = await fn(txExec);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      try {
        await client.query('ROLLBACK');
      } catch {
        // Ignore rollback failure
      }
      throw err;
    } finally {
      client.release();
    }
  }

  const runTx = async () => {
    const txExec = createSqliteExecutor(sqliteDb);
    sqliteDb.exec('BEGIN IMMEDIATE');
    try {
      const result = await fn(txExec);
      sqliteDb.exec('COMMIT');
      return result;
    } catch (err) {
      try {
        sqliteDb.exec('ROLLBACK');
      } catch {
        // Already rolled back
      }
      throw err;
    }
  };

  const next = sqliteTxChain.then(runTx, runTx);
  sqliteTxChain = next.catch(() => {});
  return next;
}

function mapEnvironmentRow(row) {
  if (!row) return null;
  let snapshot = null;
  try {
    snapshot = JSON.parse(row.config_snapshot);
  } catch {
    snapshot = null;
  }
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    config_hash: row.config_hash,
    is_default: Boolean(row.is_default),
    created_at: row.created_at,
    updated_at: row.updated_at,
    snapshot
  };
}

module.exports = {
  async init() {
    await ensureReady();
  },

  getStorageInfo() {
    return {
      engine: IS_POSTGRES ? 'postgresql' : 'sqlite',
      persistent: IS_POSTGRES || Boolean(process.env.DATA_DIR),
      schema: IS_POSTGRES ? PG_SCHEMA : undefined
    };
  },

  async ping() {
    await ensureReady();
    await rootExec.get('SELECT 1 AS ok');
    return true;
  },

  async ensureDefaultEnvironment(configHash, configSnapshot) {
    await ensureReady();
    const now = new Date().toISOString();
    await rootExec.run(
      `INSERT INTO ${tbl('environments')} (id, name, description, config_hash, config_snapshot, is_default, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 1, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         config_hash = excluded.config_hash,
         config_snapshot = excluded.config_snapshot,
         updated_at = excluded.updated_at`,
      [
        'default-smart-house',
        'Default Smart House',
        'Built-in PRD Smart House configuration (3 residents, 11 rooms)',
        configHash,
        JSON.stringify(configSnapshot),
        now,
        now
      ]
    );
    return rootExec.get(`SELECT * FROM ${tbl('environments')} WHERE id = ?`, ['default-smart-house']);
  },

  async listEnvironments() {
    await ensureReady();
    const rows = await rootExec.all(
      `SELECT id, name, description, config_hash, config_snapshot, is_default, created_at, updated_at FROM ${tbl('environments')} ORDER BY is_default DESC, created_at DESC`
    );
    return rows.map(mapEnvironmentRow);
  },

  async getEnvironment(id) {
    await ensureReady();
    const row = await rootExec.get(`SELECT * FROM ${tbl('environments')} WHERE id = ?`, [id]);
    return mapEnvironmentRow(row);
  },

  async createEnvironment({ id, name, description = '', configHash, configSnapshot }) {
    await ensureReady();
    const now = new Date().toISOString();
    await rootExec.run(
      `INSERT INTO ${tbl('environments')} (id, name, description, config_hash, config_snapshot, is_default, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 0, ?, ?)`,
      [id, name, description, configHash, JSON.stringify(configSnapshot), now, now]
    );
    return this.getEnvironment(id);
  },

  async deleteEnvironment(id) {
    await ensureReady();
    const info = await rootExec.run(`DELETE FROM ${tbl('environments')} WHERE id = ? AND is_default = 0`, [id]);
    return { deleted: info.changes > 0, id };
  },

  async getSession(id) {
    await ensureReady();
    return rootExec.get(`SELECT * FROM ${tbl('sessions')} WHERE id = ?`, [id]);
  },

  async listSessions() {
    await ensureReady();
    return rootExec.all(
      `SELECT id, config_hash, status, timezone, started_at, ended_at, strict_session_lock, environment_id, environment_name FROM ${tbl('sessions')} ORDER BY started_at DESC`
    );
  },

  async getSessionSummaries() {
    await ensureReady();
    const aggExpr = IS_POSTGRES
      ? "STRING_AGG(DISTINCT a.participant, ',')"
      : 'GROUP_CONCAT(DISTINCT a.participant)';
    const rows = await rootExec.all(`
      SELECT
        s.id,
        s.status,
        s.timezone,
        s.started_at,
        s.ended_at,
        s.config_hash,
        COALESCE(s.environment_id, 'default-smart-house') AS environment_id,
        COALESCE(s.environment_name, 'Default Smart House') AS environment_name,
        (SELECT COUNT(*) FROM ${tbl('annotations')} a WHERE a.session_id = s.id) AS annotation_count,
        (SELECT ${aggExpr} FROM ${tbl('annotations')} a WHERE a.session_id = s.id) AS active_participants
      FROM ${tbl('sessions')} s
      ORDER BY s.started_at DESC
    `);
    return rows.map(r => ({
      ...r,
      annotation_count: Number(r.annotation_count || 0)
    }));
  },

  async createSession(
    id,
    configHash,
    configSnapshot,
    timezone = 'Europe/Paris',
    environmentId = 'default-smart-house',
    environmentName = 'Default Smart House'
  ) {
    await ensureReady();
    const startedAt = new Date().toISOString();
    await rootExec.run(
      `INSERT INTO ${tbl('sessions')} (id, config_hash, config_snapshot, status, timezone, started_at, environment_id, environment_name)
       VALUES (?, ?, ?, 'active', ?, ?, ?, ?)`,
      [id, configHash, JSON.stringify(configSnapshot), timezone, startedAt, environmentId, environmentName]
    );
    return this.getSession(id);
  },

  async startSession(id) {
    await ensureReady();
    await rootExec.run(`UPDATE ${tbl('sessions')} SET status = 'active', ended_at = NULL WHERE id = ?`, [id]);
    return this.getSession(id);
  },

  async stopSession(id) {
    await ensureReady();
    const endedAt = new Date().toISOString();
    await rootExec.run(`UPDATE ${tbl('sessions')} SET status = 'stopped', ended_at = ? WHERE id = ?`, [endedAt, id]);
    return this.getSession(id);
  },

  async endSession(id) {
    return this.stopSession(id);
  },

  async deleteSession(id) {
    await inTransaction(async tx => {
      await tx.run(`DELETE FROM ${tbl('participant_tokens')} WHERE session_id = ?`, [id]);
      await tx.run(`DELETE FROM ${tbl('collaborator_locks')} WHERE session_id = ?`, [id]);
      await tx.run(`DELETE FROM ${tbl('annotations')} WHERE session_id = ?`, [id]);
      await tx.run(`DELETE FROM ${tbl('sessions')} WHERE id = ?`, [id]);
    });
    return { success: true, id };
  },

  async setSessionLockPolicy(sessionId, strict) {
    await ensureReady();
    await rootExec.run(`UPDATE ${tbl('sessions')} SET strict_session_lock = ? WHERE id = ?`, [strict ? 1 : 0, sessionId]);
    const updated = await this.getSession(sessionId);
    return updated ? Boolean(updated.strict_session_lock) : false;
  },

  async getAdminUser(username) {
    await ensureReady();
    return rootExec.get(`SELECT * FROM ${tbl('admin_users')} WHERE username = ?`, [username]);
  },

  async updateAdminPassword(username, hash, salt) {
    await ensureReady();
    await rootExec.run(
      `UPDATE ${tbl('admin_users')} SET password_hash = ?, salt = ?, must_change_password = 0, updated_at = ? WHERE username = ?`,
      [hash, salt, new Date().toISOString(), username]
    );
    return this.getAdminUser(username);
  },

  async createAdminSession(tokenHash, username, ttlMs) {
    await ensureReady();
    const now = Date.now();
    await rootExec.run(`DELETE FROM ${tbl('admin_sessions')} WHERE expires_at <= ?`, [new Date(now).toISOString()]);
    const createdAt = new Date(now).toISOString();
    const expiresAt = new Date(now + ttlMs).toISOString();
    await rootExec.run(
      `INSERT INTO ${tbl('admin_sessions')} (token_hash, username, expires_at, created_at) VALUES (?, ?, ?, ?)`,
      [tokenHash, username, expiresAt, createdAt]
    );
    return { tokenHash, username, expiresAt };
  },

  async getAdminSession(tokenHash) {
    await ensureReady();
    if (!tokenHash) return null;
    const row = await rootExec.get(`SELECT * FROM ${tbl('admin_sessions')} WHERE token_hash = ?`, [tokenHash]);
    if (!row) return null;
    if (Date.parse(row.expires_at) <= Date.now()) {
      await rootExec.run(`DELETE FROM ${tbl('admin_sessions')} WHERE token_hash = ?`, [tokenHash]);
      return null;
    }
    return row;
  },

  async deleteAdminSession(tokenHash) {
    await ensureReady();
    if (tokenHash) {
      await rootExec.run(`DELETE FROM ${tbl('admin_sessions')} WHERE token_hash = ?`, [tokenHash]);
    }
  },

  async ensureParticipantTokens(sessionId, roles) {
    await ensureReady();
    const existing = await rootExec.all(`SELECT * FROM ${tbl('participant_tokens')} WHERE session_id = ?`, [sessionId]);
    const byRole = {};
    for (const row of existing) {
      byRole[row.participant] = row.token;
    }
    const now = new Date().toISOString();
    for (const role of roles) {
      if (!byRole[role]) {
        const tok = generateToken(24);
        await rootExec.run(
          `INSERT INTO ${tbl('participant_tokens')} (token, session_id, participant, created_at)
           VALUES (?, ?, ?, ?)
           ON CONFLICT DO NOTHING`,
          [tok, sessionId, role, now]
        );
        byRole[role] = tok;
      }
    }
    const finalRows = await rootExec.all(`SELECT * FROM ${tbl('participant_tokens')} WHERE session_id = ?`, [sessionId]);
    const result = {};
    for (const row of finalRows) {
      result[row.participant] = row.token;
    }
    return result;
  },

  async getParticipantToken(token) {
    await ensureReady();
    if (!token || typeof token !== 'string') return null;
    return rootExec.get(`SELECT * FROM ${tbl('participant_tokens')} WHERE token = ?`, [token.trim()]);
  },

  async getSessionLocks(_sessionId) {
    return [];
  },

  async releaseLock(sessionId, takenPerson) {
    await ensureReady();
    await rootExec.run(`DELETE FROM ${tbl('collaborator_locks')} WHERE session_id = ? AND taken_person = ?`, [sessionId, takenPerson]);
    return [];
  },

  async releaseAllLocks(sessionId) {
    await ensureReady();
    await rootExec.run(`DELETE FROM ${tbl('collaborator_locks')} WHERE session_id = ?`, [sessionId]);
    return [];
  },

  async saveAnnotation(data) {
    return inTransaction(async tx => {
      const selectSessionSql = IS_POSTGRES
        ? `SELECT * FROM ${tbl('sessions')} WHERE id = ? FOR UPDATE`
        : `SELECT * FROM ${tbl('sessions')} WHERE id = ?`;
      const session = await tx.get(selectSessionSql, [data.session_id]);
      if (!session) {
        const err = new Error(`Session "${data.session_id}" does not exist.`);
        err.statusCode = 404;
        throw err;
      }
      if (session.status !== 'active') {
        const err = new Error(
          `Session "${data.session_id}" is currently ${session.status.toUpperCase()}. Annotations cannot be submitted while the session is stopped.`
        );
        err.statusCode = 409;
        throw err;
      }

      const existing = await tx.get(`SELECT * FROM ${tbl('annotations')} WHERE client_uuid = ?`, [data.client_uuid]);
      if (existing) {
        return { row: existing, isDuplicate: true };
      }

      const otherPerson = data.other_person ? String(data.other_person).trim() : '';
      if (otherPerson && otherPerson === data.participant) {
        const err = new Error('Participant cannot select themselves as a collaborator.');
        err.statusCode = 400;
        throw err;
      }

      const seqRow = await tx.get(
        `SELECT COALESCE(MAX(seq), 0) + 1 AS next_seq FROM ${tbl('annotations')} WHERE session_id = ? AND participant = ?`,
        [data.session_id, data.participant]
      );
      const nextSeq = Number(seqRow?.next_seq || 1);
      const tsReceived = new Date().toISOString();

      await tx.run(
        `INSERT INTO ${tbl('annotations')} (
          client_uuid, session_id, participant, seq,
          timestamp_started, timestamp_submitted, timestamp_received,
          location_id, location, activity_id, activity,
          interaction, other_person, edited, config_version
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          data.client_uuid,
          data.session_id,
          data.participant,
          nextSeq,
          data.timestamp_started,
          data.timestamp_submitted,
          tsReceived,
          data.location_id,
          data.location,
          data.activity_id,
          data.activity,
          data.interaction,
          otherPerson,
          data.edited ? 1 : 0,
          data.config_version
        ]
      );

      const saved = await tx.get(`SELECT * FROM ${tbl('annotations')} WHERE client_uuid = ?`, [data.client_uuid]);
      return { row: saved, isDuplicate: false };
    });
  },

  async getAnnotations(sessionId, participant = null) {
    await ensureReady();
    if (participant) {
      return rootExec.all(
        `SELECT * FROM ${tbl('annotations')} WHERE session_id = ? AND participant = ? ORDER BY timestamp_submitted ASC`,
        [sessionId, participant]
      );
    }
    return rootExec.all(
      `SELECT * FROM ${tbl('annotations')} WHERE session_id = ? ORDER BY timestamp_submitted ASC, participant ASC`,
      [sessionId]
    );
  },

  async exportBackup() {
    await ensureReady();
    const [environments, sessions, participant_tokens, annotations] = await Promise.all([
      rootExec.all(`SELECT * FROM ${tbl('environments')} ORDER BY is_default DESC, created_at ASC`),
      rootExec.all(`SELECT * FROM ${tbl('sessions')} ORDER BY started_at ASC`),
      rootExec.all(`SELECT * FROM ${tbl('participant_tokens')} ORDER BY created_at ASC`),
      rootExec.all(`SELECT * FROM ${tbl('annotations')} ORDER BY session_id ASC, seq ASC`)
    ]);

    return {
      format: 'smarthouse-backup-v1',
      exportedAt: new Date().toISOString(),
      storage: this.getStorageInfo(),
      data: {
        environments,
        sessions,
        participant_tokens,
        annotations
      }
    };
  },

  async restoreBackup(backupPayload) {
    if (!backupPayload || typeof backupPayload !== 'object' || backupPayload.format !== 'smarthouse-backup-v1') {
      const err = new Error('Invalid backup format. Expected "smarthouse-backup-v1" JSON file.');
      err.statusCode = 400;
      throw err;
    }
    const data = backupPayload.data;
    if (!data || typeof data !== 'object') {
      const err = new Error('Backup file is missing the "data" payload.');
      err.statusCode = 400;
      throw err;
    }

    const summary = {
      environmentsAdded: 0,
      sessionsAdded: 0,
      tokensAdded: 0,
      annotationsAdded: 0
    };

    await inTransaction(async tx => {
      const envs = Array.isArray(data.environments) ? data.environments : [];
      for (const env of envs) {
        if (!env || typeof env.id !== 'string' || !env.id.trim() || env.id === 'default-smart-house') continue;
        const snapshotStr = typeof env.config_snapshot === 'string'
          ? env.config_snapshot
          : JSON.stringify(env.config_snapshot || {});
        const res = await tx.run(
          `INSERT INTO ${tbl('environments')} (id, name, description, config_hash, config_snapshot, is_default, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT (id) DO NOTHING`,
          [
            env.id.trim(),
            String(env.name || env.id),
            String(env.description || ''),
            String(env.config_hash || ''),
            snapshotStr,
            env.is_default ? 1 : 0,
            String(env.created_at || new Date().toISOString()),
            String(env.updated_at || new Date().toISOString())
          ]
        );
        summary.environmentsAdded += res.changes;
      }

      const sessions = Array.isArray(data.sessions) ? data.sessions : [];
      for (const s of sessions) {
        if (!s || typeof s.id !== 'string' || !s.id.trim()) continue;
        const snapshotStr = typeof s.config_snapshot === 'string'
          ? s.config_snapshot
          : JSON.stringify(s.config_snapshot || {});
        const res = await tx.run(
          `INSERT INTO ${tbl('sessions')} (id, config_hash, config_snapshot, status, timezone, started_at, ended_at, strict_session_lock, environment_id, environment_name)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT (id) DO NOTHING`,
          [
            s.id.trim(),
            String(s.config_hash || ''),
            snapshotStr,
            s.status === 'stopped' ? 'stopped' : 'active',
            String(s.timezone || 'Europe/Paris'),
            String(s.started_at || new Date().toISOString()),
            s.ended_at ? String(s.ended_at) : null,
            s.strict_session_lock ? 1 : 0,
            String(s.environment_id || 'default-smart-house'),
            String(s.environment_name || 'Default Smart House')
          ]
        );
        summary.sessionsAdded += res.changes;
      }

      const validSessionRows = await tx.all(`SELECT id FROM ${tbl('sessions')}`);
      const validSessionIds = new Set(validSessionRows.map(r => r.id));

      const tokens = Array.isArray(data.participant_tokens) ? data.participant_tokens : [];
      for (const t of tokens) {
        if (!t || !t.token || !t.session_id || !t.participant || !validSessionIds.has(t.session_id)) continue;
        const res = await tx.run(
          `INSERT INTO ${tbl('participant_tokens')} (token, session_id, participant, created_at)
           VALUES (?, ?, ?, ?)
           ON CONFLICT DO NOTHING`,
          [
            String(t.token),
            String(t.session_id),
            String(t.participant),
            String(t.created_at || new Date().toISOString())
          ]
        );
        summary.tokensAdded += res.changes;
      }

      const annotations = Array.isArray(data.annotations) ? data.annotations : [];
      for (const a of annotations) {
        if (!a || !a.client_uuid || !a.session_id || !validSessionIds.has(a.session_id)) continue;
        const res = await tx.run(
          `INSERT INTO ${tbl('annotations')} (
            client_uuid, session_id, participant, seq,
            timestamp_started, timestamp_submitted, timestamp_received,
            location_id, location, activity_id, activity,
            interaction, other_person, edited, config_version
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT (client_uuid) DO NOTHING`,
          [
            String(a.client_uuid),
            String(a.session_id),
            String(a.participant),
            Number(a.seq || 1),
            String(a.timestamp_started || a.timestamp_submitted || new Date().toISOString()),
            String(a.timestamp_submitted || new Date().toISOString()),
            String(a.timestamp_received || new Date().toISOString()),
            Number(a.location_id || 0),
            String(a.location || ''),
            Number(a.activity_id || 0),
            String(a.activity || ''),
            String(a.interaction || 'solo'),
            String(a.other_person || ''),
            a.edited ? 1 : 0,
            String(a.config_version || '')
          ]
        );
        summary.annotationsAdded += res.changes;
      }
    });

    return summary;
  }
};
