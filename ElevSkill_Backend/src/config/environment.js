import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, '..', '..');

dotenv.config({ path: path.join(backendRoot, '.env') });

const toBool = (value, fallback = false) => {
  if (value === undefined || value === null || value === '') return fallback;
  return String(value).trim().toLowerCase() === 'true';
};

const toInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const env = {
  backendRoot,
  port: toInt(process.env.PORT, 5000),
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',

  sql: {
    server: process.env.SQL_SERVER || '.\\SQLEXPRESS',
    port: toInt(process.env.SQL_PORT, 1433),
    database: process.env.SQL_DATABASE || 'ELEVSKILL_AI_DB',
    user: process.env.SQL_USER || '',
    password: process.env.SQL_PASSWORD || '',
    encrypt: toBool(process.env.SQL_ENCRYPT, false),
    trustServerCertificate: toBool(process.env.SQL_TRUST_SERVER_CERTIFICATE, true),
    trustedConnection: toBool(process.env.SQL_TRUSTED_CONNECTION, !process.env.SQL_USER),
    odbcDriver: process.env.SQL_ODBC_DRIVER || 'ODBC Driver 17 for SQL Server',
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'dev_insecure_change_me_in_env',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  aiServices: {
    resumeAnalyzerUrl: (process.env.RESUME_ANALYZER_URL || 'http://127.0.0.1:8000').replace(/\/+$/, ''),
    interviewCoachUrl: (process.env.INTERVIEW_COACH_URL || 'http://127.0.0.1:8002').replace(/\/+$/, ''),
    jobMatcherUrl: (process.env.JOB_MATCHER_URL || 'http://127.0.0.1:8003').replace(/\/+$/, ''),
    careerRoadmapUrl: (process.env.CAREER_ROADMAP_URL || 'http://127.0.0.1:8004').replace(/\/+$/, ''),
  },
};
