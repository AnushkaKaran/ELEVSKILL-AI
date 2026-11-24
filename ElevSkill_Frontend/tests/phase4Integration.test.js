import 'fake-indexeddb/auto';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  DB_NAME,
  GUEST_OWNER_ID,
  STORE_NAMES,
  calculateDashboardStats,
  loadOwnerWorkspace,
  resetDbConnectionForTests,
  saveRecord,
  saveResumeRecord,
} from '../src/utils/indexedDbStore.js';
import {
  RESUME_ANALYZER_API_URL,
  ResumeAnalyzerApiError,
  analyzeResumeWithApi,
} from '../src/services/resumeAnalyzerApi.js';
import {
  INTERVIEW_COACH_API_URL,
  InterviewCoachApiError,
  evaluateInterviewAnswer,
} from '../src/services/interviewCoachApi.js';
import {
  JOB_MATCHER_API_URL,
  JobMatcherApiError,
  matchProfileToJob,
} from '../src/services/jobMatcherApi.js';
import {
  CAREER_ROADMAP_API_URL,
  CareerRoadmapApiError,
  generateCareerRoadmap,
} from '../src/services/careerRoadmapApi.js';

describe('Phase 4 — IndexedDB Workspace & Direct FastAPI Clients', () => {
  beforeEach(async () => {
    resetDbConnectionForTests();
    await new Promise((resolve, reject) => {
      const req = indexedDB.deleteDatabase(DB_NAME);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
      req.onblocked = () => resolve();
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('isolates authenticated workspaces across two Firebase UIDs and account switches', async () => {
    await saveRecord(STORE_NAMES.PROFILES, { name: 'User A', targetRole: 'Backend Developer' }, 'uid-A');
    await saveResumeRecord({ name: 'User A Resume', extractedText: 'Python, SQL' }, 'uid-A');
    await saveRecord(STORE_NAMES.RESUME_DRAFTS, { title: 'Draft A', template: 'modern', draftData: { fullName: 'User A' } }, 'uid-A');
    await saveRecord(STORE_NAMES.RESUME_ANALYSES, { overallScore: 88, status: 'Strong' }, 'uid-A');
    await saveRecord(STORE_NAMES.INTERVIEW_HISTORY, { score: 84, category: 'Backend' }, 'uid-A');
    await saveRecord(STORE_NAMES.JOB_MATCH_HISTORY, { overallScore: 79 }, 'uid-A');
    await saveRecord(STORE_NAMES.ROADMAP_SKILLS, { title: 'Docker', status: 'completed', hours: 6 }, 'uid-A');
    await saveRecord(STORE_NAMES.ACTIVITY_LOGS, { title: 'Action A', category: 'Settings' }, 'uid-A');

    await saveRecord(STORE_NAMES.PROFILES, { name: 'User B', targetRole: 'Data Analyst' }, 'uid-B');
    await saveResumeRecord({ name: 'User B Resume', extractedText: 'SQL, Pandas' }, 'uid-B');

    const wsA = await loadOwnerWorkspace('uid-A');
    const wsB = await loadOwnerWorkspace('uid-B');
    const wsGuest = await loadOwnerWorkspace(GUEST_OWNER_ID);

    expect(wsA.profile.name).toBe('User A');
    expect(wsA.savedResumes).toHaveLength(1);
    expect(wsA.resumeDrafts).toHaveLength(1);
    expect(wsA.latestResumeAnalysis.overallScore).toBe(88);
    expect(wsA.interviewHistory).toHaveLength(1);
    expect(wsA.latestJobMatch.overallScore).toBe(79);
    expect(wsA.roadmapSkills).toHaveLength(1);
    expect(wsA.activityLog).toHaveLength(1);

    expect(wsB.profile.name).toBe('User B');
    expect(wsB.savedResumes).toHaveLength(1);
    expect(wsB.savedResumes[0].name).toBe('User B Resume');
    expect(wsB.resumeDrafts).toHaveLength(0);
    expect(wsB.interviewHistory).toHaveLength(0);

    expect(wsGuest.profile).toBeNull();
    expect(wsGuest.savedResumes).toHaveLength(0);

    const statsA = await calculateDashboardStats('uid-A');
    expect(statsA.roadmapProgressPercent).toBe(100);
    expect(statsA.avgInterviewScore).toBe(84);
  });

  it('uses direct FastAPI URLs with sensible localhost defaults', () => {
    expect(RESUME_ANALYZER_API_URL).toMatch(/^https?:\/\//);
    expect(INTERVIEW_COACH_API_URL).toMatch(/^https?:\/\//);
    expect(JOB_MATCHER_API_URL).toMatch(/^https?:\/\//);
    expect(CAREER_ROADMAP_API_URL).toMatch(/^https?:\/\//);
  });

  it('calls Python FastAPI endpoints directly and prevents failed AI calls from creating history', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');

    // 1. Resume Analyzer failure (503) throws and writes nothing to IndexedDB
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ detail: 'Model unavailable' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    await expect(analyzeResumeWithApi('Python resume text', '')).rejects.toBeInstanceOf(
      ResumeAnalyzerApiError
    );
    expect(fetchMock).toHaveBeenLastCalledWith(
      `${RESUME_ANALYZER_API_URL}/analyze`,
      expect.objectContaining({ method: 'POST' })
    );

    // 2. Interview Coach failure (network error) throws
    fetchMock.mockRejectedValueOnce(new Error('Network down'));
    await expect(evaluateInterviewAnswer('My answer', 'Backend')).rejects.toBeInstanceOf(
      InterviewCoachApiError
    );

    // 3. Job Matcher failure (422) throws
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ detail: 'Invalid job payload' }), {
        status: 422,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    await expect(matchProfileToJob({ skills: [] }, { description: 'x' })).rejects.toBeInstanceOf(
      JobMatcherApiError
    );

    // 4. Career Roadmap failure (invalid JSON) throws
    fetchMock.mockResolvedValueOnce(
      new Response('not-json', { status: 500 })
    );
    await expect(generateCareerRoadmap({ target_role: 'Full Stack Developer' })).rejects.toBeInstanceOf(
      CareerRoadmapApiError
    );

    // No false history records created in IndexedDB
    const ws = await loadOwnerWorkspace(GUEST_OWNER_ID);
    expect(ws.latestResumeAnalysis).toBeNull();
    expect(ws.interviewHistory).toHaveLength(0);
    expect(ws.latestJobMatch).toBeNull();
  });
});
