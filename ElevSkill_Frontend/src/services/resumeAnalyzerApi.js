import { AI_HEALTH_TIMEOUT_MS, AI_SERVICE_TIMEOUT_MS, withTimeoutSignal } from './apiTimeout';

export const RESUME_ANALYZER_API_URL = (
  import.meta.env.VITE_RESUME_ANALYZER_API_URL || 'http://127.0.0.1:8000'
).replace(/\/+$/, '');

export class ResumeAnalyzerApiError extends Error {
  constructor(message, { status = null, code = 'API_ERROR' } = {}) {
    super(message);
    this.name = 'ResumeAnalyzerApiError';
    this.status = status;
    this.code = code;
  }
}

function extractApiErrorMessage(data, status) {
  if (status === 503) {
    return 'The Resume Analyzer service is currently unavailable. Please start the service and try again.';
  }
  if (status === 422 && Array.isArray(data?.detail) && data.detail.length > 0) {
    const firstMsg = data.detail[0]?.msg;
    return typeof firstMsg === 'string'
      ? firstMsg.replace(/^Value error,\s*/i, '')
      : 'Please check your resume and job description inputs.';
  }
  if (typeof data?.detail === 'string' && data.detail.trim()) {
    return data.detail;
  }
  return `Resume Analyzer service returned an unexpected error (HTTP ${status}).`;
}

export async function checkResumeAnalyzerHealth({ signal } = {}) {
  const { signal: timedSignal, cleanup } = withTimeoutSignal(signal, AI_HEALTH_TIMEOUT_MS);
  try {
    const response = await fetch(`${RESUME_ANALYZER_API_URL}/health`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: timedSignal,
    });
    if (!response.ok) {
      return {
        reachable: true,
        ok: false,
        modelLoaded: false,
        error: 'Resume Analyzer service is not ready.',
      };
    }
    const data = await response.json();
    return {
      reachable: true,
      ok: data?.status === 'ok' && Boolean(data?.model_loaded),
      status: data?.status || 'unknown',
      modelLoaded: Boolean(data?.model_loaded),
    };
  } catch {
    return {
      reachable: false,
      ok: false,
      modelLoaded: false,
      error: 'Resume Analyzer API is currently unavailable.',
    };
  } finally {
    cleanup();
  }
}

export async function analyzeResumeWithApi(resumeText, jobDescription, { signal } = {}) {
  const { signal: timedSignal, didTimeout, cleanup } = withTimeoutSignal(
    signal,
    AI_SERVICE_TIMEOUT_MS
  );
  let response;
  try {
    response = await fetch(`${RESUME_ANALYZER_API_URL}/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        resume_text: resumeText,
        job_description: jobDescription && jobDescription.trim() ? jobDescription : null,
      }),
      signal: timedSignal,
    });
  } catch (err) {
    cleanup();
    if (didTimeout() || err?.name === 'AbortError' || timedSignal.aborted) {
      const isUserAbort = Boolean(signal?.aborted) && !didTimeout();
      throw new ResumeAnalyzerApiError(
        isUserAbort
          ? 'Request cancelled.'
          : 'Resume Analyzer request timed out (the AI service may still be waking up). Please try again.',
        { status: null, code: isUserAbort ? 'ABORTED' : 'TIMEOUT' }
      );
    }
    throw new ResumeAnalyzerApiError(
      'Unable to reach the Resume Analyzer AI service right now. Please try again.',
      { status: null, code: 'NETWORK_ERROR' }
    );
  }
  cleanup();

  let data = null;
  try {
    data = await response.json();
  } catch {
    throw new ResumeAnalyzerApiError(
      'Received an invalid response from the Resume Analyzer service.',
      { status: response.status, code: 'INVALID_RESPONSE' }
    );
  }

  if (!response.ok) {
    const code =
      response.status === 422
        ? 'VALIDATION_ERROR'
        : response.status === 503
          ? 'SERVICE_UNAVAILABLE'
          : 'API_ERROR';
    throw new ResumeAnalyzerApiError(extractApiErrorMessage(data, response.status), {
      status: response.status,
      code,
    });
  }

  if (
    !data ||
    typeof data !== 'object' ||
    data.valid !== true ||
    typeof data.overall_score !== 'number' ||
    !data.skills_analysis
  ) {
    throw new ResumeAnalyzerApiError(
      'Received an incomplete analysis response from the server.',
      { status: response.status, code: 'INVALID_RESPONSE' }
    );
  }

  return data;
}

export async function extractPdfResumeText(file, { signal } = {}) {
  const formData = new FormData();
  formData.append('file', file);

  const { signal: timedSignal, didTimeout, cleanup } = withTimeoutSignal(
    signal,
    AI_SERVICE_TIMEOUT_MS
  );
  let response;
  try {
    response = await fetch(`${RESUME_ANALYZER_API_URL}/extract-pdf`, {
      method: 'POST',
      body: formData,
      signal: timedSignal,
    });
  } catch (err) {
    cleanup();
    if (didTimeout() || err?.name === 'AbortError' || timedSignal.aborted) {
      const isUserAbort = Boolean(signal?.aborted) && !didTimeout();
      throw new ResumeAnalyzerApiError(
        isUserAbort
          ? 'PDF extraction cancelled.'
          : 'PDF extraction timed out (the AI service may still be waking up). Please try again.',
        { status: null, code: isUserAbort ? 'ABORTED' : 'TIMEOUT' }
      );
    }
    throw new ResumeAnalyzerApiError(
      'Unable to reach the Resume Analyzer AI service to extract PDF text. Please try again.',
      { status: null, code: 'NETWORK_ERROR' }
    );
  }
  cleanup();

  let data = null;
  try {
    data = await response.json();
  } catch {
    throw new ResumeAnalyzerApiError(
      'Received an invalid response while extracting PDF text.',
      { status: response.status, code: 'INVALID_RESPONSE' }
    );
  }

  if (!response.ok) {
    const code = response.status === 422 ? 'VALIDATION_ERROR' : 'API_ERROR';
    throw new ResumeAnalyzerApiError(extractApiErrorMessage(data, response.status), {
      status: response.status,
      code,
    });
  }

  return data;
}
