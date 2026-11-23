import sqlTedious from 'mssql';
import { env } from './environment.js';

let activeDriver = null;
let poolPromise = null;

async function loadSqlDriver() {
  if (activeDriver) return activeDriver;

  if (env.sql.trustedConnection && !env.sql.user) {
    const mod = await import('mssql/msnodesqlv8.js');
    activeDriver = mod.default || mod;
  } else {
    activeDriver = sqlTedious;
  }

  return activeDriver;
}

function buildConnectionConfig() {
  if (env.sql.trustedConnection && !env.sql.user) {
    const driverName = env.sql.odbcDriver || 'ODBC Driver 17 for SQL Server';
    const trustCert = env.sql.trustServerCertificate ? 'yes' : 'no';
    return {
      connectionString: `Driver={${driverName}};Server=${env.sql.server};Database=${env.sql.database};Trusted_Connection=yes;TrustServerCertificate=${trustCert};`,
      options: {
        trustedConnection: true,
        trustServerCertificate: env.sql.trustServerCertificate,
      },
      pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000,
      },
    };
  }

  const serverHost = env.sql.server.includes('\\')
    ? env.sql.server.split('\\')[0]
    : env.sql.server;
  const instanceName = env.sql.server.includes('\\')
    ? env.sql.server.split('\\')[1]
    : undefined;

  return {
    server: serverHost,
    port: instanceName ? undefined : env.sql.port,
    database: env.sql.database,
    user: env.sql.user,
    password: env.sql.password,
    options: {
      ...(instanceName ? { instanceName } : {}),
      encrypt: env.sql.encrypt,
      trustServerCertificate: env.sql.trustServerCertificate,
    },
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000,
    },
  };
}

export async function getPool() {
  if (poolPromise) {
    return poolPromise;
  }

  poolPromise = (async () => {
    const driver = await loadSqlDriver();
    const config = buildConnectionConfig();
    const pool = new driver.ConnectionPool(config);
    pool.on('error', (err) => {
      console.error('[SQL Pool Error]', err?.message || err);
    });
    await pool.connect();
    return pool;
  })().catch((err) => {
    poolPromise = null;
    throw err;
  });

  return poolPromise;
}

export async function checkDatabaseHealth() {
  try {
    const pool = await getPool();
    const result = await pool.request().query('SELECT DB_NAME() AS dbName, @@SERVERNAME AS serverName');
    const row = result.recordset?.[0] || {};
    return {
      connected: true,
      database: row.dbName || env.sql.database,
      server: row.serverName || env.sql.server,
    };
  } catch (err) {
    return {
      connected: false,
      database: env.sql.database,
      error: err?.message || 'Database connection failed',
    };
  }
}

export async function closePool() {
  if (!poolPromise) return;
  try {
    const pool = await poolPromise;
    await pool.close();
  } catch {
    // ignore close errors
  } finally {
    poolPromise = null;
  }
}

export const sql = sqlTedious;
