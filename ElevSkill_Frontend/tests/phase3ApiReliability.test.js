import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AI_SERVICE_TIMEOUT_MS } from '../src/services/apiTimeout';
import {
  analyzeResumeWithApi,
  extractPdfResumeText,
  ResumeAnalyzerApiError,
} from '../src/services/resumeAnalyzerApi';
import {
  generateCareerRoadmap,
  CareerRoadmapApiError,
} from '../src/services/careerRoadmapApi';
import {
  matchProfileToJob,
  JobMatcherApiError,
} from '../src/services/jobMatcherApi';
import {
  evaluateInterviewAnswer,
  InterviewCoachApiError,
} from '../src/services/interviewCoachApi';

const mockGetFirebaseServices = vi.fn();
const mockGetGenerativeModel = vi.fn();

vi.mock('../src/config/firebase.js', () => ({
  FirebaseConfigError: class FirebaseConfigError extends Error {
    constructor(message, missingKeys = []) {
      super(message);
      this.name = 'FirebaseConfigError';
      this.missingKeys = missingKeys;
    }
  },
  getFirebaseServices: (...args) => mockGetFirebaseServices(...args),
}));

vi.mock('firebase/ai', () => ({
  InferenceMode: {
    PREFER_ON_DEVICE: 'prefer_on_device',
    ONLY_IN_CLOUD: 'only_in_cloud',
    ONLY_ON_DEVICE: 'only_on_device',
  },
  InferenceSource: { ON_DEVICE: 'on_device', IN_CLOUD: 'in_cloud' },
  getGenerativeModel: (...args) => mockGetGenerativeModel(...args),
}));

import {
  generateHybridPromptResponse,
  FirebaseAiServiceError,
} from '../src/services/firebaseAiService';

function createAbortOnTimeoutFetch() {
  return vi.fn((_url, options = {}) => {
    return new Promise((_resolve, reject) => {
      if (options.signal) {
        options.signal.addEventListener(
          'abort',
          () => {
            const err = new Error('The operation was aborted.');
            err.name = 'AbortError';
            reject(err);
          },
          { once: true }
        );
      }
    });
  });
}

describe('Phase 3 API timeout and error classification', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('configures 90-second timeout for Render Free cold starts', () => {
    expect(AI_SERVICE_TIMEOUT_MS).toBe(90000);
  });

  it('classifies Career Roadmap timeouts as TIMEOUT instead of NETWORK_ERROR', async () => {
    globalThis.fetch = createAbortOnTimeoutFetch();
    const promise = generateCareerRoadmap({ target_role: 'Data Analyst' });
    const assertion = expect(promise).rejects.toMatchObject({
      name: 'CareerRoadmapApiError',
      code: 'TIMEOUT',
    });
    await vi.advanceTimersByTimeAsync(AI_SERVICE_TIMEOUT_MS);
    await assertion;
  });

  it('classifies Resume Analyzer, Job Matcher, and Interview Coach timeouts as TIMEOUT', async () => {
    globalThis.fetch = createAbortOnTimeoutFetch();

    const p1 = analyzeResumeWithApi('Jane Doe resume text', null);
    const a1 = expect(p1).rejects.toBeInstanceOf(ResumeAnalyzerApiError);
    const a1Code = expect(p1).rejects.toMatchObject({ code: 'TIMEOUT' });
    await vi.advanceTimersByTimeAsync(AI_SERVICE_TIMEOUT_MS);
    await a1;
    await a1Code;

    const p2 = matchProfileToJob({ skills: ['React'] }, { description: 'React developer role' });
    const a2 = expect(p2).rejects.toBeInstanceOf(JobMatcherApiError);
    const a2Code = expect(p2).rejects.toMatchObject({ code: 'TIMEOUT' });
    await vi.advanceTimersByTimeAsync(AI_SERVICE_TIMEOUT_MS);
    await a2;
    await a2Code;

    const p3 = evaluateInterviewAnswer('My answer', 'behavioral', { questionId: 'beh-1' });
    const a3 = expect(p3).rejects.toBeInstanceOf(InterviewCoachApiError);
    const a3Code = expect(p3).rejects.toMatchObject({ code: 'TIMEOUT' });
    await vi.advanceTimersByTimeAsync(AI_SERVICE_TIMEOUT_MS);
    await a3;
    await a3Code;
  });

  it('distinguishes real network errors from timeouts', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(generateCareerRoadmap({ target_role: 'Data Analyst' })).rejects.toMatchObject({
      code: 'NETWORK_ERROR',
    });
  });

  it('preserves 422 PDF page-limit error details in extractPdfResumeText', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      json: async () => ({
        detail: 'PDF exceeds the 25-page limit for resume extraction.',
        error_code: 'TOO_MANY_PAGES',
      }),
    });

    const fakeFile = new Blob(['%PDF-1.4'], { type: 'application/pdf' });
    await expect(extractPdfResumeText(fakeFile)).rejects.toMatchObject({
      status: 422,
      code: 'VALIDATION_ERROR',
      message: 'PDF exceeds the 25-page limit for resume extraction.',
    });
  });
});

describe('Phase 3 Firebase AI Quick Assistant error classification', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockGetFirebaseServices.mockImplementation(() => ({
      ai: { id: Symbol('mock-ai') },
      appCheckConfigured: true,
    }));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('classifies 45s timeout cleanly as TIMEOUT and clears inFlightRequest', async () => {
    mockGetGenerativeModel.mockReturnValue({
      generateContent: vi.fn((_prompt, { signal }) => {
        return new Promise((_resolve, reject) => {
          signal.addEventListener(
            'abort',
            () => {
              const err = new Error('Aborted');
              err.name = 'AbortError';
              reject(err);
            },
            { once: true }
          );
        });
      }),
    });

    const p = generateHybridPromptResponse('Explain closures');
    const check = expect(p).rejects.toMatchObject({ code: 'TIMEOUT' });
    await vi.advanceTimersByTimeAsync(25000);
    await check;

    // Subsequent request should not be blocked by stale inFlightRequest
    mockGetGenerativeModel.mockReturnValue({
      generateContent: vi.fn().mockResolvedValue({
        response: { text: () => 'Closures capture lexical scope.', inferenceSource: 'in_cloud' },
      }),
    });
    const res = await generateHybridPromptResponse('Explain promises');
    expect(res.inferenceSource).toBe('IN_CLOUD');
    expect(res.text).toBe('Closures capture lexical scope.');
  });

  it('distinguishes FALLBACK_FAILED, NETWORK_ERROR, and APP_CHECK_ERROR', async () => {
    mockGetGenerativeModel.mockReturnValue({
      generateContent: vi.fn().mockRejectedValue(new Error('Gemini Nano on-device unavailable (503)')),
    });
    await expect(generateHybridPromptResponse('Tip please')).rejects.toBeInstanceOf(
      FirebaseAiServiceError
    );
    await expect(generateHybridPromptResponse('Tip please')).rejects.toMatchObject({
      code: 'FALLBACK_FAILED',
    });

    mockGetGenerativeModel.mockReturnValue({
      generateContent: vi.fn().mockRejectedValue(new Error('Failed to fetch')),
    });
    await expect(generateHybridPromptResponse('Tip please')).rejects.toMatchObject({
      code: 'NETWORK_ERROR',
    });

    mockGetGenerativeModel.mockReturnValue({
      generateContent: vi.fn().mockRejectedValue(new Error('App Check token 403')),
    });
    await expect(generateHybridPromptResponse('Tip please')).rejects.toMatchObject({
      code: 'APP_CHECK_ERROR',
    });
  });

  it('provides at least 10 distinct resume and job description samples including genuine fresher draft', async () => {
    const { SAMPLE_RESUMES, SAMPLE_JOB_DESCRIPTIONS } = await import('../src/data/sampleData');
    expect(SAMPLE_RESUMES.length).toBeGreaterThanOrEqual(10);
    expect(SAMPLE_JOB_DESCRIPTIONS.length).toBeGreaterThanOrEqual(10);
    expect(new Set(SAMPLE_RESUMES.map((r) => r.resumeText)).size).toBe(SAMPLE_RESUMES.length);
    expect(new Set(SAMPLE_JOB_DESCRIPTIONS.map((j) => j.description)).size).toBe(
      SAMPLE_JOB_DESCRIPTIONS.length
    );

    const fresherDraft = SAMPLE_RESUMES.find((r) => r.id === 'fresher-weak-draft');
    expect(fresherDraft).toBeDefined();
    expect(fresherDraft.resumeText.toLowerCase()).not.toContain('intern');
    expect(fresherDraft.resumeText.toLowerCase()).not.toContain('frontend developer with');
  });
});
