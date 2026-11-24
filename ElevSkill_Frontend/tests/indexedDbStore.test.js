import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import {
  ALL_STORES,
  BACKUP_FORMAT,
  BACKUP_VERSION,
  DB_NAME,
  GUEST_OWNER_ID,
  MAX_PDF_BLOB_BYTES,
  STORE_NAMES,
  IndexedDbStorageError,
  calculateDashboardStats,
  clearOwnerWorkspace,
  deleteRecord,
  exportWorkspaceBackup,
  getDb,
  getRecord,
  importWorkspaceBackup,
  initDatabase,
  listRecordsByOwner,
  migrateGuestLocalStorageToIndexedDb,
  resetDbConnectionForTests,
  saveRecord,
  saveResumeRecord,
  updateRecord,
  validateWorkspaceBackup,
} from '../src/utils/indexedDbStore.js';
import { STORAGE_KEYS } from '../src/utils/dashboardStore.js';

function createMemoryStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem(key) {
      return map.has(key) ? map.get(key) : null;
    },
    setItem(key, val) {
      map.set(key, String(val));
    },
    removeItem(key) {
      map.delete(key);
    },
    clear() {
      map.clear();
    },
  };
}

describe('indexedDbStore (Phase 2)', () => {
  beforeEach(async () => {
    resetDbConnectionForTests();
    await new Promise((resolve, reject) => {
      const req = indexedDB.deleteDatabase(DB_NAME);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
      req.onblocked = () => resolve();
    });
  });

  it('initializes elevskill_db with all 8 object stores and required indexes', async () => {
    const db = await initDatabase();
    expect(db.name).toBe(DB_NAME);
    expect(ALL_STORES).toHaveLength(8);
    for (const storeName of ALL_STORES) {
      expect(db.objectStoreNames.contains(storeName)).toBe(true);
    }

    const tx = db.transaction(ALL_STORES, 'readonly');
    expect(tx.objectStore(STORE_NAMES.PROFILES).indexNames.contains('ownerId')).toBe(true);
    expect(tx.objectStore(STORE_NAMES.RESUME_ANALYSES).indexNames.contains('resumeId')).toBe(true);
    expect(tx.objectStore(STORE_NAMES.JOB_MATCH_HISTORY).indexNames.contains('resumeId')).toBe(true);
    expect(tx.objectStore(STORE_NAMES.ACTIVITY_LOGS).indexNames.contains('createdAt')).toBe(true);
    await tx.done;
  });

  it('supports CRUD operations across stores and rejects oversized PDF blobs', async () => {
    const saved = await saveResumeRecord(
      {
        name: 'My Resume',
        extractedText: 'Python, React, SQL',
        originalFileName: 'resume.pdf',
        lastScore: 84,
        classification: 'Full Stack Developer',
        pdfBlob: new Blob(['%PDF-1.4'], { type: 'application/pdf' }),
      },
      GUEST_OWNER_ID
    );
    expect(saved.id).toBeTruthy();
    expect(saved.ownerId).toBe(GUEST_OWNER_ID);
    expect(saved.hasPdfBlob).toBe(true);

    const fetched = await getRecord(STORE_NAMES.RESUMES, saved.id, GUEST_OWNER_ID);
    expect(fetched.extractedText).toBe('Python, React, SQL');

    const updated = await updateRecord(
      STORE_NAMES.RESUMES,
      saved.id,
      { lastScore: 91 },
      GUEST_OWNER_ID
    );
    expect(updated.lastScore).toBe(91);

    const listed = await listRecordsByOwner(STORE_NAMES.RESUMES, GUEST_OWNER_ID);
    expect(listed).toHaveLength(1);
    expect(listed[0].lastScore).toBe(91);

    const deleted = await deleteRecord(STORE_NAMES.RESUMES, saved.id, GUEST_OWNER_ID);
    expect(deleted).toBe(true);
    expect(await getRecord(STORE_NAMES.RESUMES, saved.id, GUEST_OWNER_ID)).toBeNull();

    const oversized = { size: MAX_PDF_BLOB_BYTES + 1 };
    Object.setPrototypeOf(oversized, Blob.prototype);
    await expect(
      saveResumeRecord({ name: 'Huge', extractedText: 'x', pdfBlob: oversized }, GUEST_OWNER_ID)
    ).rejects.toMatchObject({ code: 'QUOTA_EXCEEDED' });
  });

  it('enforces strict owner isolation and clears only the target owner workspace', async () => {
    const guestSkill = await saveRecord(
      STORE_NAMES.ROADMAP_SKILLS,
      { title: 'React', status: 'completed', hours: 10 },
      GUEST_OWNER_ID
    );
    const userSkill = await saveRecord(
      STORE_NAMES.ROADMAP_SKILLS,
      { title: 'Docker', status: 'in_progress', hours: 6 },
      'uid-123'
    );

    expect(await getRecord(STORE_NAMES.ROADMAP_SKILLS, userSkill.id, GUEST_OWNER_ID)).toBeNull();
    expect(await updateRecord(STORE_NAMES.ROADMAP_SKILLS, userSkill.id, { status: 'completed' }, GUEST_OWNER_ID)).toBeNull();
    expect(await deleteRecord(STORE_NAMES.ROADMAP_SKILLS, userSkill.id, GUEST_OWNER_ID)).toBe(false);

    await saveRecord(STORE_NAMES.ACTIVITY_LOGS, { title: 'Signed-in action', category: 'roadmap' }, 'uid-123');
    await clearOwnerWorkspace('uid-123');

    expect(await listRecordsByOwner(STORE_NAMES.ROADMAP_SKILLS, 'uid-123')).toHaveLength(0);
    expect(await listRecordsByOwner(STORE_NAMES.ACTIVITY_LOGS, 'uid-123')).toHaveLength(0);
    expect(await listRecordsByOwner(STORE_NAMES.ROADMAP_SKILLS, GUEST_OWNER_ID)).toHaveLength(1);
    expect((await listRecordsByOwner(STORE_NAMES.ROADMAP_SKILLS, GUEST_OWNER_ID))[0].id).toBe(guestSkill.id);
  });

  it('calculates dashboard stats for an owner workspace', async () => {
    await saveRecord(STORE_NAMES.PROFILES, { name: 'Alex', targetRole: 'Full Stack Developer' }, GUEST_OWNER_ID);
    await saveResumeRecord({ name: 'CV', extractedText: 'Python' }, GUEST_OWNER_ID);
    await saveRecord(STORE_NAMES.RESUME_ANALYSES, { overallScore: 82 }, GUEST_OWNER_ID);
    await saveRecord(STORE_NAMES.JOB_MATCH_HISTORY, { overallScore: 76 }, GUEST_OWNER_ID);
    await saveRecord(STORE_NAMES.INTERVIEW_HISTORY, { score: 80 }, GUEST_OWNER_ID);
    await saveRecord(STORE_NAMES.INTERVIEW_HISTORY, { score: 90 }, GUEST_OWNER_ID);
    await saveRecord(STORE_NAMES.ROADMAP_SKILLS, { title: 'SQL', status: 'completed', hours: 6 }, GUEST_OWNER_ID);
    await saveRecord(STORE_NAMES.ROADMAP_SKILLS, { title: 'Docker', status: 'not_started', hours: 6 }, GUEST_OWNER_ID);

    const stats = await calculateDashboardStats(GUEST_OWNER_ID);
    expect(stats.hasProfile).toBe(true);
    expect(stats.savedResumesCount).toBe(1);
    expect(stats.latestResumeScore).toBe(82);
    expect(stats.latestJobMatchScore).toBe(76);
    expect(stats.interviewCount).toBe(2);
    expect(stats.avgInterviewScore).toBe(85);
    expect(stats.roadmapTotalSkills).toBe(2);
    expect(stats.roadmapCompletedSkills).toBe(1);
    expect(stats.roadmapProgressPercent).toBe(50);
  });

  it('exports and imports workspace backups while preserving relationships, stripping secrets, and isolating owners', async () => {
    const resume = await saveResumeRecord(
      {
        id: 'res-shared-1',
        name: 'Main CV',
        extractedText: 'Node.js, SQL',
        pdfBlob: new Blob(['pdf'], { type: 'application/pdf' }),
      },
      'uid-source'
    );
    await saveRecord(
      STORE_NAMES.RESUME_ANALYSES,
      { id: 'ana-1', resumeId: resume.id, overallScore: 88, token: 'secret-jwt' },
      'uid-source'
    );
    await saveRecord(
      STORE_NAMES.PROFILES,
      { name: 'Source User', password: 'should-not-export' },
      'uid-source'
    );

    const backup = await exportWorkspaceBackup('uid-source');
    expect(backup.format).toBe(BACKUP_FORMAT);
    expect(backup.version).toBe(BACKUP_VERSION);
    expect(backup.data.profiles[0].password).toBeUndefined();
    expect(backup.data.resumeAnalyses[0].token).toBeUndefined();
    expect(backup.data.resumes[0].pdfBlob).toBeUndefined();

    // Import into a different owner without overwriting uid-source's records
    const importResult = await importWorkspaceBackup(backup, 'uid-target');
    expect(importResult.status).toBe('imported');

    const targetResumes = await listRecordsByOwner(STORE_NAMES.RESUMES, 'uid-target');
    const targetAnalyses = await listRecordsByOwner(STORE_NAMES.RESUME_ANALYSES, 'uid-target');
    expect(targetResumes).toHaveLength(1);
    expect(targetResumes[0].id).not.toBe('res-shared-1');
    expect(targetAnalyses[0].resumeId).toBe(targetResumes[0].id);

    // Original owner remains untouched
    const sourceResume = await getRecord(STORE_NAMES.RESUMES, 'res-shared-1', 'uid-source');
    expect(sourceResume).not.toBeNull();
  });

  it('rejects malformed or incompatible backups safely', async () => {
    expect(validateWorkspaceBackup(null).valid).toBe(false);
    expect(validateWorkspaceBackup({ format: 'wrong', version: 1, data: {} }).valid).toBe(false);
    expect(validateWorkspaceBackup({ format: BACKUP_FORMAT, version: 99, data: {} }).valid).toBe(false);
    expect(
      validateWorkspaceBackup({ format: BACKUP_FORMAT, version: BACKUP_VERSION, data: { resumes: 'bad' } }).valid
    ).toBe(false);

    await expect(importWorkspaceBackup({ bad: true }, GUEST_OWNER_ID)).rejects.toMatchObject({
      code: 'INVALID_BACKUP',
    });
  });

  it('migrates guest localStorage data once, prevents duplicates, and leaves original localStorage intact', async () => {
    const sessionId = 'g-test-session';
    const storage = createMemoryStorage({
      elevskill_active_guest_session_id: sessionId,
      elevskill_auth_token: 'do-not-migrate-jwt',
      [`elevskill_guest_${sessionId}_${STORAGE_KEYS.PROFILE}`]: JSON.stringify({
        name: 'Guest Explorer',
        targetRole: 'Full Stack Developer',
      }),
      [`elevskill_guest_${sessionId}_${STORAGE_KEYS.SKILLS}`]: JSON.stringify([
        { id: 's1', title: 'SQL', status: 'completed', hours: 6 },
      ]),
      [`elevskill_guest_${sessionId}_${STORAGE_KEYS.SAVED_RESUMES}`]: JSON.stringify([
        { id: 'r1', name: 'Guest CV', text: 'Python, SQL' },
      ]),
      [`elevskill_guest_${sessionId}_${STORAGE_KEYS.INTERVIEW_HISTORY}`]: JSON.stringify([
        { category: 'Backend', score: 85, feedback: 'Good' },
      ]),
    });

    const first = await migrateGuestLocalStorageToIndexedDb({ storage });
    expect(first.status).toBe('migrated');
    expect(first.migratedCounts.profiles).toBe(1);
    expect(first.migratedCounts.resumes).toBe(1);
    expect(first.migratedCounts.roadmapSkills).toBe(1);
    expect(first.migratedCounts.interviewHistory).toBe(1);

    // Original localStorage preserved
    expect(storage.getItem(`elevskill_guest_${sessionId}_${STORAGE_KEYS.PROFILE}`)).not.toBeNull();
    expect(storage.getItem('elevskill_auth_token')).toBe('do-not-migrate-jwt');

    // Second run prevents duplicate imports
    const second = await migrateGuestLocalStorageToIndexedDb({ storage });
    expect(second.status).toBe('already_migrated');
    expect(await listRecordsByOwner(STORE_NAMES.RESUMES, GUEST_OWNER_ID)).toHaveLength(1);
    expect(await listRecordsByOwner(STORE_NAMES.ROADMAP_SKILLS, GUEST_OWNER_ID)).toHaveLength(1);
  });

  it('handles unavailable IndexedDB and migration failures gracefully', async () => {
    const originalIndexedDb = globalThis.indexedDB;
    resetDbConnectionForTests();
    try {
      Object.defineProperty(globalThis, 'indexedDB', {
        value: undefined,
        configurable: true,
      });

      await expect(getDb()).rejects.toBeInstanceOf(IndexedDbStorageError);
      const storage = createMemoryStorage({
        elevskill_active_guest_session_id: 'g-fail',
        [`elevskill_guest_g-fail_${STORAGE_KEYS.PROFILE}`]: JSON.stringify({ name: 'Fail Test' }),
      });
      const res = await migrateGuestLocalStorageToIndexedDb({ storage });
      expect(res.status).toBe('failed');
      expect(res.code).toBe('STORAGE_UNAVAILABLE');
    } finally {
      Object.defineProperty(globalThis, 'indexedDB', {
        value: originalIndexedDb,
        configurable: true,
      });
      resetDbConnectionForTests();
    }
  });

  it('clears hasPdfBlob on backup export/import when pdfBlob binary is excluded', async () => {
    const pdfBlob = new Blob(['%PDF-1.4 sample'], { type: 'application/pdf' });
    await saveResumeRecord(
      {
        id: 'res-pdf-meta',
        name: 'Sample Resume',
        text: 'Jane Doe software engineer resume text',
        pdfBlob,
        hasPdfBlob: true,
        originalFileName: 'sample.pdf',
        originalFileDataUrl: null,
      },
      'user-backup-meta'
    );

    const backup = await exportWorkspaceBackup('user-backup-meta');
    expect(backup.data[STORE_NAMES.RESUMES][0].pdfBlob).toBeUndefined();
    expect(backup.data[STORE_NAMES.RESUMES][0].hasPdfBlob).toBe(false);

    await importWorkspaceBackup(backup, 'user-backup-meta-2', { replaceExisting: true });
    const importedResumes = await listRecordsByOwner(STORE_NAMES.RESUMES, 'user-backup-meta-2');
    expect(importedResumes).toHaveLength(1);
    expect(importedResumes[0].hasPdfBlob).toBe(false);
    expect(importedResumes[0].pdfBlob).toBeUndefined();
  });
});
