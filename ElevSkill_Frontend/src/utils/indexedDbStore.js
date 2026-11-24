import { openDB } from 'idb';
import {
  STORAGE_KEYS,
  calculateRoadmapProgress,
  getActiveGuestSessionId,
} from './dashboardStore.js';

export const DB_NAME = 'elevskill_db';
export const DB_VERSION = 1;
export const GUEST_OWNER_ID = 'guest';
export const BACKUP_FORMAT = 'elevskill-ai-workspace-backup';
export const BACKUP_VERSION = 1;
export const MAX_PDF_BLOB_BYTES = 10 * 1024 * 1024; // 10 MB

export const STORE_NAMES = Object.freeze({
  PROFILES: 'profiles',
  RESUMES: 'resumes',
  RESUME_ANALYSES: 'resumeAnalyses',
  RESUME_DRAFTS: 'resumeDrafts',
  INTERVIEW_HISTORY: 'interviewHistory',
  JOB_MATCH_HISTORY: 'jobMatchHistory',
  ROADMAP_SKILLS: 'roadmapSkills',
  ACTIVITY_LOGS: 'activityLogs',
});

export const ALL_STORES = Object.freeze(Object.values(STORE_NAMES));

const STORE_INDEX_DEFINITIONS = {
  [STORE_NAMES.PROFILES]: [
    { name: 'ownerId', keyPath: 'ownerId', options: { unique: true } },
    { name: 'updatedAt', keyPath: 'updatedAt', options: { unique: false } },
  ],
  [STORE_NAMES.RESUMES]: [
    { name: 'ownerId', keyPath: 'ownerId', options: { unique: false } },
    { name: 'createdAt', keyPath: 'createdAt', options: { unique: false } },
    { name: 'updatedAt', keyPath: 'updatedAt', options: { unique: false } },
  ],
  [STORE_NAMES.RESUME_ANALYSES]: [
    { name: 'ownerId', keyPath: 'ownerId', options: { unique: false } },
    { name: 'resumeId', keyPath: 'resumeId', options: { unique: false } },
    { name: 'createdAt', keyPath: 'createdAt', options: { unique: false } },
    { name: 'updatedAt', keyPath: 'updatedAt', options: { unique: false } },
  ],
  [STORE_NAMES.RESUME_DRAFTS]: [
    { name: 'ownerId', keyPath: 'ownerId', options: { unique: false } },
    { name: 'createdAt', keyPath: 'createdAt', options: { unique: false } },
    { name: 'updatedAt', keyPath: 'updatedAt', options: { unique: false } },
  ],
  [STORE_NAMES.INTERVIEW_HISTORY]: [
    { name: 'ownerId', keyPath: 'ownerId', options: { unique: false } },
    { name: 'createdAt', keyPath: 'createdAt', options: { unique: false } },
    { name: 'updatedAt', keyPath: 'updatedAt', options: { unique: false } },
  ],
  [STORE_NAMES.JOB_MATCH_HISTORY]: [
    { name: 'ownerId', keyPath: 'ownerId', options: { unique: false } },
    { name: 'resumeId', keyPath: 'resumeId', options: { unique: false } },
    { name: 'createdAt', keyPath: 'createdAt', options: { unique: false } },
    { name: 'updatedAt', keyPath: 'updatedAt', options: { unique: false } },
  ],
  [STORE_NAMES.ROADMAP_SKILLS]: [
    { name: 'ownerId', keyPath: 'ownerId', options: { unique: false } },
    { name: 'createdAt', keyPath: 'createdAt', options: { unique: false } },
    { name: 'updatedAt', keyPath: 'updatedAt', options: { unique: false } },
  ],
  [STORE_NAMES.ACTIVITY_LOGS]: [
    { name: 'ownerId', keyPath: 'ownerId', options: { unique: false } },
    { name: 'createdAt', keyPath: 'createdAt', options: { unique: false } },
  ],
};

const SENSITIVE_KEYS = new Set([
  'token',
  'authToken',
  'accessToken',
  'refreshToken',
  'password',
  'passwordHash',
  'secret',
  'apiKey',
]);

export class IndexedDbStorageError extends Error {
  constructor(message, code = 'STORAGE_ERROR', cause = null) {
    super(message);
    this.name = 'IndexedDbStorageError';
    this.code = code;
    this.cause = cause;
  }
}

let dbPromise = null;

function assertValidStore(storeName) {
  if (!ALL_STORES.includes(storeName)) {
    throw new IndexedDbStorageError(`Unknown object store: ${storeName}`, 'VALIDATION_ERROR');
  }
}

function normalizeOwnerId(ownerId) {
  if (typeof ownerId === 'string' && ownerId.trim()) {
    return ownerId.trim();
  }
  return GUEST_OWNER_ID;
}

export function generateRecordId(prefix = 'rec') {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return `${prefix}-${globalThis.crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function wrapStorageError(err, fallbackMessage = 'IndexedDB operation failed.') {
  if (err instanceof IndexedDbStorageError) return err;
  const name = err?.name || '';
  if (name === 'QuotaExceededError' || err?.code === 22) {
    return new IndexedDbStorageError(
      'Browser storage quota exceeded. Export your backup or remove large files.',
      'QUOTA_EXCEEDED',
      err
    );
  }
  return new IndexedDbStorageError(err?.message || fallbackMessage, 'STORAGE_ERROR', err);
}

function stripSensitiveFields(value) {
  if (Array.isArray(value)) {
    return value.map(stripSensitiveFields);
  }
  if (!value || typeof value !== 'object') {
    return value;
  }
  // Omit raw Blob/File binaries from JSON backups while keeping metadata
  if (typeof Blob !== 'undefined' && value instanceof Blob) {
    return undefined;
  }
  const clean = {};
  for (const [k, v] of Object.entries(value)) {
    if (SENSITIVE_KEYS.has(k)) continue;
    const sanitized = stripSensitiveFields(v);
    if (sanitized !== undefined) {
      clean[k] = sanitized;
    }
  }
  return clean;
}

function validateResumeBlob(pdfBlob) {
  if (pdfBlob === undefined || pdfBlob === null) return null;
  if (typeof Blob !== 'undefined' && !(pdfBlob instanceof Blob)) {
    throw new IndexedDbStorageError('pdfBlob must be a Blob or File instance.', 'VALIDATION_ERROR');
  }
  if (typeof pdfBlob.size === 'number' && pdfBlob.size > MAX_PDF_BLOB_BYTES) {
    throw new IndexedDbStorageError(
      `PDF file exceeds browser storage limit (${Math.round(MAX_PDF_BLOB_BYTES / (1024 * 1024))} MB).`,
      'QUOTA_EXCEEDED'
    );
  }
  return pdfBlob;
}

function sortByTimestampDesc(records) {
  return [...records].sort((a, b) => {
    const aTime = Date.parse(a?.updatedAt || a?.createdAt || 0) || 0;
    const bTime = Date.parse(b?.updatedAt || b?.createdAt || 0) || 0;
    return bTime - aTime;
  });
}

export function resetDbConnectionForTests() {
  if (dbPromise) {
    dbPromise.then((db) => db?.close?.()).catch(() => {});
    dbPromise = null;
  }
}

export async function initDatabase() {
  if (typeof indexedDB === 'undefined') {
    throw new IndexedDbStorageError(
      'IndexedDB is not available in this browser environment.',
      'STORAGE_UNAVAILABLE'
    );
  }

  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, _oldVersion, _newVersion, transaction) {
        for (const storeName of ALL_STORES) {
          const store = db.objectStoreNames.contains(storeName)
            ? transaction.objectStore(storeName)
            : db.createObjectStore(storeName, { keyPath: 'id' });

          const indexes = STORE_INDEX_DEFINITIONS[storeName] || [];
          for (const idx of indexes) {
            if (!store.indexNames.contains(idx.name)) {
              store.createIndex(idx.name, idx.keyPath, idx.options);
            }
          }
        }
      },
      blocked() {
        // Another tab holds an older version open
      },
      blocking() {
        dbPromise?.then((db) => db?.close?.()).catch(() => {});
        dbPromise = null;
      },
      terminated() {
        dbPromise = null;
      },
    }).catch((err) => {
      dbPromise = null;
      throw wrapStorageError(err, 'Failed to open IndexedDB database.');
    });
  }

  return dbPromise;
}

export async function getDb() {
  return initDatabase();
}

export async function saveRecord(storeName, record, ownerId = GUEST_OWNER_ID) {
  assertValidStore(storeName);
  if (!record || typeof record !== 'object') {
    throw new IndexedDbStorageError('Record must be an object.', 'VALIDATION_ERROR');
  }

  const normalizedOwner = normalizeOwnerId(ownerId);
  const now = new Date().toISOString();

  const payload = {
    ...record,
    id:
      storeName === STORE_NAMES.PROFILES
        ? record.id || `profile-${normalizedOwner}`
        : record.id || generateRecordId(storeName.slice(0, 4)),
    ownerId: normalizedOwner,
    createdAt: record.createdAt || now,
    updatedAt: now,
  };

  if (storeName === STORE_NAMES.RESUMES && payload.pdfBlob !== undefined) {
    payload.pdfBlob = validateResumeBlob(payload.pdfBlob);
    payload.hasPdfBlob = Boolean(payload.pdfBlob);
  }

  try {
    const db = await getDb();
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);

    if (storeName === STORE_NAMES.PROFILES) {
      const existing = await store.index('ownerId').get(normalizedOwner);
      if (existing) {
        payload.id = existing.id;
        payload.createdAt = existing.createdAt || payload.createdAt;
      }
    }

    await store.put(payload);
    await tx.done;
    return payload;
  } catch (err) {
    throw wrapStorageError(err, `Failed to save record in ${storeName}.`);
  }
}

export async function getRecord(storeName, id, ownerId = null) {
  assertValidStore(storeName);
  if (!id) return null;

  try {
    const db = await getDb();
    const record = await db.get(storeName, id);
    if (!record) return null;
    if (ownerId !== null && record.ownerId !== normalizeOwnerId(ownerId)) {
      return null;
    }
    return record;
  } catch (err) {
    throw wrapStorageError(err, `Failed to read record from ${storeName}.`);
  }
}

export async function listRecordsByOwner(storeName, ownerId = GUEST_OWNER_ID) {
  assertValidStore(storeName);
  const normalizedOwner = normalizeOwnerId(ownerId);

  try {
    const db = await getDb();
    const records = await db.getAllFromIndex(storeName, 'ownerId', normalizedOwner);
    return sortByTimestampDesc(records);
  } catch (err) {
    throw wrapStorageError(err, `Failed to list records from ${storeName}.`);
  }
}

export async function updateRecord(storeName, id, patch, ownerId = GUEST_OWNER_ID) {
  assertValidStore(storeName);
  if (!id || !patch || typeof patch !== 'object') {
    throw new IndexedDbStorageError('Valid id and patch object are required.', 'VALIDATION_ERROR');
  }

  const normalizedOwner = normalizeOwnerId(ownerId);

  try {
    const db = await getDb();
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const existing = await store.get(id);

    if (!existing || existing.ownerId !== normalizedOwner) {
      await tx.done;
      return null;
    }

    const updated = {
      ...existing,
      ...patch,
      id: existing.id,
      ownerId: existing.ownerId,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    };

    if (storeName === STORE_NAMES.RESUMES && updated.pdfBlob !== undefined) {
      updated.pdfBlob = validateResumeBlob(updated.pdfBlob);
      updated.hasPdfBlob = Boolean(updated.pdfBlob);
    }

    await store.put(updated);
    await tx.done;
    return updated;
  } catch (err) {
    throw wrapStorageError(err, `Failed to update record in ${storeName}.`);
  }
}

export async function deleteRecord(storeName, id, ownerId = GUEST_OWNER_ID) {
  assertValidStore(storeName);
  if (!id) return false;

  const normalizedOwner = normalizeOwnerId(ownerId);

  try {
    const db = await getDb();
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const existing = await store.get(id);

    if (!existing || existing.ownerId !== normalizedOwner) {
      await tx.done;
      return false;
    }

    await store.delete(id);
    await tx.done;
    return true;
  } catch (err) {
    throw wrapStorageError(err, `Failed to delete record from ${storeName}.`);
  }
}

async function deleteOwnerRecordsInStore(store, ownerId) {
  const keys = await store.index('ownerId').getAllKeys(ownerId);
  for (const key of keys) {
    await store.delete(key);
  }
  return keys.length;
}

export async function clearOwnerWorkspace(ownerId = GUEST_OWNER_ID) {
  const normalizedOwner = normalizeOwnerId(ownerId);

  try {
    const db = await getDb();
    const tx = db.transaction(ALL_STORES, 'readwrite');
    const deletedCounts = {};

    for (const storeName of ALL_STORES) {
      const store = tx.objectStore(storeName);
      deletedCounts[storeName] = await deleteOwnerRecordsInStore(store, normalizedOwner);
    }

    await tx.done;
    return { ownerId: normalizedOwner, deletedCounts };
  } catch (err) {
    throw wrapStorageError(err, 'Failed to clear workspace.');
  }
}

export async function saveResumeRecord(resumeInput, ownerId = GUEST_OWNER_ID) {
  const extracted = String(resumeInput?.extractedText ?? resumeInput?.text ?? '');
  const record = {
    id: resumeInput?.id,
    name: String(resumeInput?.name || resumeInput?.originalFileName || 'Untitled Resume').trim(),
    text: extracted,
    extractedText: extracted,
    originalFileName: resumeInput?.originalFileName || null,
    originalFileDataUrl: resumeInput?.originalFileDataUrl || null,
    lastScore: typeof resumeInput?.lastScore === 'number' ? resumeInput.lastScore : null,
    classification: resumeInput?.classification || '',
    savedAt: resumeInput?.savedAt || new Date().toISOString(),
    pdfBlob: validateResumeBlob(resumeInput?.pdfBlob ?? null),
  };
  return saveRecord(STORE_NAMES.RESUMES, record, ownerId);
}

export async function loadOwnerWorkspace(ownerId = GUEST_OWNER_ID) {
  const normalizedOwner = normalizeOwnerId(ownerId);

  try {
    const db = await getDb();
    const tx = db.transaction(ALL_STORES, 'readonly');

    const [
      profiles,
      resumes,
      analyses,
      drafts,
      interviews,
      jobMatches,
      roadmapSkills,
      activityLogs,
    ] = await Promise.all(
      ALL_STORES.map((storeName) => tx.objectStore(storeName).index('ownerId').getAll(normalizedOwner))
    );
    await tx.done;

    const sortedResumes = sortByTimestampDesc(resumes).map((r) => ({
      ...r,
      text: r.text ?? r.extractedText ?? '',
      extractedText: r.extractedText ?? r.text ?? '',
      savedAt: r.savedAt ?? r.createdAt,
    }));
    const sortedAnalyses = sortByTimestampDesc(analyses);
    const sortedInterviews = sortByTimestampDesc(interviews);
    const sortedMatches = sortByTimestampDesc(jobMatches);
    const sortedActivity = sortByTimestampDesc(activityLogs);

    return {
      ownerId: normalizedOwner,
      profile: profiles[0] || null,
      savedResumes: sortedResumes,
      latestResumeAnalysis: sortedAnalyses[0] || null,
      resumeDrafts: sortByTimestampDesc(drafts),
      interviewHistory: sortedInterviews,
      latestInterviewSession: sortedInterviews[0] || null,
      latestJobMatch: sortedMatches[0] || null,
      roadmapSkills,
      activityLog: sortedActivity,
    };
  } catch (err) {
    throw wrapStorageError(err, 'Failed to load workspace from IndexedDB.');
  }
}

export async function calculateDashboardStats(ownerId = GUEST_OWNER_ID) {
  const normalizedOwner = normalizeOwnerId(ownerId);

  try {
    const db = await getDb();
    const tx = db.transaction(ALL_STORES, 'readonly');

    const [
      profiles,
      resumes,
      analyses,
      drafts,
      interviews,
      jobMatches,
      roadmapSkills,
      activityLogs,
    ] = await Promise.all(
      ALL_STORES.map((storeName) => tx.objectStore(storeName).index('ownerId').getAll(normalizedOwner))
    );
    await tx.done;

    const sortedAnalyses = sortByTimestampDesc(analyses);
    const sortedMatches = sortByTimestampDesc(jobMatches);
    const sortedInterviews = sortByTimestampDesc(interviews);
    const roadmapProgress = calculateRoadmapProgress(roadmapSkills);

    const interviewScores = sortedInterviews
      .map((item) => item?.score ?? item?.evaluationScore)
      .filter((n) => typeof n === 'number' && Number.isFinite(n));

    const avgInterviewScore =
      interviewScores.length > 0
        ? Math.round(interviewScores.reduce((sum, n) => sum + n, 0) / interviewScores.length)
        : null;

    return {
      ownerId: normalizedOwner,
      hasProfile: profiles.length > 0,
      savedResumesCount: resumes.length,
      resumeAnalysesCount: analyses.length,
      resumeDraftsCount: drafts.length,
      latestResumeScore: sortedAnalyses[0]?.overallScore ?? null,
      latestJobMatchScore: sortedMatches[0]?.overallScore ?? null,
      interviewCount: interviews.length,
      avgInterviewScore,
      roadmapTotalSkills: roadmapProgress.totalCount,
      roadmapCompletedSkills: roadmapProgress.completedCount,
      roadmapProgressPercent: roadmapProgress.overallPercent,
      recentActivityCount: activityLogs.length,
    };
  } catch (err) {
    throw wrapStorageError(err, 'Failed to calculate dashboard statistics.');
  }
}

export async function exportWorkspaceBackup(ownerId = GUEST_OWNER_ID) {
  const normalizedOwner = normalizeOwnerId(ownerId);

  try {
    const db = await getDb();
    const tx = db.transaction(ALL_STORES, 'readonly');
    const data = {};

    for (const storeName of ALL_STORES) {
      const rows = await tx.objectStore(storeName).index('ownerId').getAll(normalizedOwner);
      data[storeName] = sortByTimestampDesc(rows).map((row) => {
        const stripped = stripSensitiveFields(row);
        if (storeName === STORE_NAMES.RESUMES && stripped && typeof stripped === 'object') {
          return {
            ...stripped,
            hasPdfBlob: false,
          };
        }
        return stripped;
      });
    }

    await tx.done;

    return {
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      ownerId: normalizedOwner,
      data,
    };
  } catch (err) {
    throw wrapStorageError(err, 'Failed to export workspace backup.');
  }
}

export function validateWorkspaceBackup(backup) {
  if (!backup || typeof backup !== 'object' || Array.isArray(backup)) {
    return { valid: false, error: 'Backup payload must be a JSON object.' };
  }
  if (backup.format !== BACKUP_FORMAT) {
    return { valid: false, error: 'Unsupported backup format identifier.' };
  }
  if (backup.version !== BACKUP_VERSION) {
    return { valid: false, error: `Unsupported backup version: ${backup.version}.` };
  }
  if (!backup.data || typeof backup.data !== 'object' || Array.isArray(backup.data)) {
    return { valid: false, error: 'Backup is missing the data object.' };
  }

  for (const storeName of ALL_STORES) {
    if (backup.data[storeName] !== undefined && !Array.isArray(backup.data[storeName])) {
      return { valid: false, error: `Backup store "${storeName}" must be an array.` };
    }
  }

  return { valid: true, error: null };
}

export async function importWorkspaceBackup(
  backup,
  targetOwnerId = GUEST_OWNER_ID,
  { replaceExisting = true } = {}
) {
  const validation = validateWorkspaceBackup(backup);
  if (!validation.valid) {
    throw new IndexedDbStorageError(validation.error, 'INVALID_BACKUP');
  }

  const normalizedOwner = normalizeOwnerId(targetOwnerId);
  const now = new Date().toISOString();

  try {
    const db = await getDb();
    const tx = db.transaction(ALL_STORES, 'readwrite');

    if (replaceExisting) {
      for (const storeName of ALL_STORES) {
        await deleteOwnerRecordsInStore(tx.objectStore(storeName), normalizedOwner);
      }
    }

    const resumeIdMap = new Map();
    const importedCounts = {};

    const resolveSafeId = async (store, rawId, prefix) => {
      if (store.name === STORE_NAMES.PROFILES) {
        return `profile-${normalizedOwner}`;
      }
      if (!rawId || typeof rawId !== 'string') {
        return generateRecordId(prefix);
      }
      const existing = await store.get(rawId);
      if (existing && existing.ownerId !== normalizedOwner) {
        return generateRecordId(prefix);
      }
      return rawId;
    };

    // Import resumes first so resumeAnalyses and jobMatchHistory preserve relational links
    const resumesStore = tx.objectStore(STORE_NAMES.RESUMES);
    const rawResumes = Array.isArray(backup.data[STORE_NAMES.RESUMES])
      ? backup.data[STORE_NAMES.RESUMES]
      : [];
    importedCounts[STORE_NAMES.RESUMES] = 0;

    for (const raw of rawResumes) {
      if (!raw || typeof raw !== 'object') continue;
      const sanitized = stripSensitiveFields(raw);
      const safeId = await resolveSafeId(resumesStore, sanitized.id, 'res');
      if (sanitized.id) {
        resumeIdMap.set(sanitized.id, safeId);
      }
      await resumesStore.put({
        ...sanitized,
        id: safeId,
        ownerId: normalizedOwner,
        hasPdfBlob: Boolean(sanitized.pdfBlob),
        createdAt: sanitized.createdAt || now,
        updatedAt: sanitized.updatedAt || now,
      });
      importedCounts[STORE_NAMES.RESUMES] += 1;
    }

    for (const storeName of ALL_STORES) {
      if (storeName === STORE_NAMES.RESUMES) continue;
      const store = tx.objectStore(storeName);
      const rows = Array.isArray(backup.data[storeName]) ? backup.data[storeName] : [];
      importedCounts[storeName] = 0;

      for (const raw of rows) {
        if (!raw || typeof raw !== 'object') continue;
        const sanitized = stripSensitiveFields(raw);
        const safeId = await resolveSafeId(store, sanitized.id, storeName.slice(0, 4));
        const nextRecord = {
          ...sanitized,
          id: safeId,
          ownerId: normalizedOwner,
          createdAt: sanitized.createdAt || now,
          updatedAt: sanitized.updatedAt || now,
        };

        if (
          (storeName === STORE_NAMES.RESUME_ANALYSES || storeName === STORE_NAMES.JOB_MATCH_HISTORY) &&
          nextRecord.resumeId &&
          resumeIdMap.has(nextRecord.resumeId)
        ) {
          nextRecord.resumeId = resumeIdMap.get(nextRecord.resumeId);
        }

        await store.put(nextRecord);
        importedCounts[storeName] += 1;
      }
    }

    await tx.done;
    return {
      status: 'imported',
      ownerId: normalizedOwner,
      importedCounts,
    };
  } catch (err) {
    throw wrapStorageError(err, 'Failed to import workspace backup.');
  }
}

function readLegacyOrScopedGuestKey(storage, sessionId, baseKey) {
  const scopedKey = `elevskill_guest_${sessionId}_${baseKey}`;
  const raw = storage.getItem(scopedKey) ?? storage.getItem(baseKey);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function migrateGuestLocalStorageToIndexedDb({
  storage = typeof window !== 'undefined' ? window.localStorage : null,
  ownerId = GUEST_OWNER_ID,
  clearLegacy = false,
} = {}) {
  if (!storage) {
    return { status: 'empty', migratedCounts: {}, reason: 'No localStorage available.' };
  }

  const normalizedOwner = normalizeOwnerId(ownerId);
  const sessionId = getActiveGuestSessionId(storage);

  try {
    const db = await getDb();
    const existingProfile = await db.getFromIndex(STORE_NAMES.PROFILES, 'ownerId', normalizedOwner);
    if (existingProfile?.migratedGuestSessionId === sessionId) {
      return {
        status: 'already_migrated',
        ownerId: normalizedOwner,
        migratedCounts: {},
      };
    }

    const profile = readLegacyOrScopedGuestKey(storage, sessionId, STORAGE_KEYS.PROFILE);
    const skills = readLegacyOrScopedGuestKey(storage, sessionId, STORAGE_KEYS.SKILLS);
    const resumeAnalysis = readLegacyOrScopedGuestKey(storage, sessionId, STORAGE_KEYS.RESUME_ANALYSIS);
    const savedResumes = readLegacyOrScopedGuestKey(storage, sessionId, STORAGE_KEYS.SAVED_RESUMES);
    const jobMatch = readLegacyOrScopedGuestKey(storage, sessionId, STORAGE_KEYS.JOB_MATCH);
    const interviewHistory = readLegacyOrScopedGuestKey(storage, sessionId, STORAGE_KEYS.INTERVIEW_HISTORY);
    const activity = readLegacyOrScopedGuestKey(storage, sessionId, STORAGE_KEYS.ACTIVITY);
    const builderDraft = readLegacyOrScopedGuestKey(storage, sessionId, STORAGE_KEYS.BUILDER_DRAFT);

    const hasAnyData = Boolean(
      profile ||
        (Array.isArray(skills) && skills.length > 0) ||
        resumeAnalysis ||
        (Array.isArray(savedResumes) && savedResumes.length > 0) ||
        jobMatch ||
        (Array.isArray(interviewHistory) && interviewHistory.length > 0) ||
        (Array.isArray(activity) && activity.length > 0) ||
        builderDraft
    );

    if (!hasAnyData) {
      return { status: 'empty', ownerId: normalizedOwner, migratedCounts: {} };
    }

    const now = new Date().toISOString();
    const tx = db.transaction(ALL_STORES, 'readwrite');
    const migratedCounts = {
      profiles: 0,
      resumes: 0,
      resumeAnalyses: 0,
      resumeDrafts: 0,
      interviewHistory: 0,
      jobMatchHistory: 0,
      roadmapSkills: 0,
      activityLogs: 0,
    };

    const profilePayload = stripSensitiveFields(profile && typeof profile === 'object' ? profile : {});
    await tx.objectStore(STORE_NAMES.PROFILES).put({
      ...profilePayload,
      id: `profile-${normalizedOwner}`,
      ownerId: normalizedOwner,
      migratedGuestSessionId: sessionId,
      createdAt: existingProfile?.createdAt || now,
      updatedAt: now,
    });
    migratedCounts.profiles = 1;

    if (Array.isArray(savedResumes)) {
      const store = tx.objectStore(STORE_NAMES.RESUMES);
      for (const r of savedResumes) {
        if (!r || typeof r !== 'object') continue;
        const clean = stripSensitiveFields(r);
        await store.put({
          ...clean,
          id: clean.id || generateRecordId('res'),
          ownerId: normalizedOwner,
          name: clean.name || 'Untitled Resume',
          extractedText: clean.extractedText ?? clean.text ?? '',
          createdAt: clean.createdAt || now,
          updatedAt: clean.updatedAt || now,
        });
        migratedCounts.resumes += 1;
      }
    }

    if (resumeAnalysis && typeof resumeAnalysis === 'object') {
      const clean = stripSensitiveFields(resumeAnalysis);
      await tx.objectStore(STORE_NAMES.RESUME_ANALYSES).put({
        ...clean,
        id: clean.id || `migrated-analysis-${sessionId}`,
        ownerId: normalizedOwner,
        overallScore: clean.overall_score ?? clean.overallScore ?? 0,
        createdAt: clean.createdAt || now,
        updatedAt: now,
      });
      migratedCounts.resumeAnalyses = 1;
    }

    if (builderDraft && typeof builderDraft === 'object') {
      const clean = stripSensitiveFields(builderDraft);
      await tx.objectStore(STORE_NAMES.RESUME_DRAFTS).put({
        ...clean,
        id: `migrated-draft-${sessionId}`,
        ownerId: normalizedOwner,
        createdAt: clean.createdAt || now,
        updatedAt: now,
      });
      migratedCounts.resumeDrafts = 1;
    }

    if (Array.isArray(interviewHistory)) {
      const store = tx.objectStore(STORE_NAMES.INTERVIEW_HISTORY);
      for (let i = 0; i < interviewHistory.length; i += 1) {
        const item = interviewHistory[i];
        if (!item || typeof item !== 'object') continue;
        const clean = stripSensitiveFields(item);
        await store.put({
          ...clean,
          id: clean.id || `migrated-int-${sessionId}-${i}`,
          ownerId: normalizedOwner,
          createdAt: clean.practicedAt || clean.createdAt || now,
          updatedAt: now,
        });
        migratedCounts.interviewHistory += 1;
      }
    }

    if (jobMatch && typeof jobMatch === 'object') {
      const clean = stripSensitiveFields(jobMatch);
      await tx.objectStore(STORE_NAMES.JOB_MATCH_HISTORY).put({
        ...clean,
        id: clean.id || `migrated-match-${sessionId}`,
        ownerId: normalizedOwner,
        overallScore: clean.overall_match_score ?? clean.overallScore ?? 0,
        createdAt: clean.createdAt || now,
        updatedAt: now,
      });
      migratedCounts.jobMatchHistory = 1;
    }

    if (Array.isArray(skills)) {
      const store = tx.objectStore(STORE_NAMES.ROADMAP_SKILLS);
      for (const s of skills) {
        if (!s || typeof s !== 'object') continue;
        const clean = stripSensitiveFields(s);
        await store.put({
          ...clean,
          id: clean.id || generateRecordId('skl'),
          ownerId: normalizedOwner,
          createdAt: clean.createdAt || now,
          updatedAt: clean.updatedAt || now,
        });
        migratedCounts.roadmapSkills += 1;
      }
    }

    if (Array.isArray(activity)) {
      const store = tx.objectStore(STORE_NAMES.ACTIVITY_LOGS);
      for (let i = 0; i < activity.length; i += 1) {
        const act = activity[i];
        if (!act || typeof act !== 'object') continue;
        const clean = stripSensitiveFields(act);
        await store.put({
          ...clean,
          id: clean.id || `migrated-act-${sessionId}-${i}`,
          ownerId: normalizedOwner,
          createdAt: clean.createdAt || now,
        });
        migratedCounts.activityLogs += 1;
      }
    }

    await tx.done;

    if (clearLegacy) {
      Object.values(STORAGE_KEYS).forEach((baseKey) => {
        storage.removeItem(`elevskill_guest_${sessionId}_${baseKey}`);
        storage.removeItem(baseKey);
      });
    }

    return {
      status: 'migrated',
      ownerId: normalizedOwner,
      migratedCounts,
    };
  } catch (err) {
    const wrapped = wrapStorageError(err, 'Failed to migrate guest localStorage data.');
    return {
      status: 'failed',
      ownerId: normalizedOwner,
      migratedCounts: {},
      error: wrapped.message,
      code: wrapped.code,
    };
  }
}
