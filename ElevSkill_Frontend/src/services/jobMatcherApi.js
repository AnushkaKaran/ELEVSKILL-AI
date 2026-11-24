import { AI_HEALTH_TIMEOUT_MS, AI_SERVICE_TIMEOUT_MS, withTimeoutSignal } from './apiTimeout';

export const JOB_MATCHER_API_URL = (
  import.meta.env.VITE_JOB_MATCHER_API_URL || 'http://127.0.0.1:8003'
).replace(/\/+$/, '');

export class JobMatcherApiError extends Error {
  constructor(message, { status = null, code = 'API_ERROR' } = {}) {
    super(message);
    this.name = 'JobMatcherApiError';
    this.status = status;
    this.code = code;
  }
}

function extractApiErrorMessage(data, status) {
  if (status === 503) {
    return 'The Job Matcher AI service is currently unavailable. Please try again shortly.';
  }
  if (status === 422 && Array.isArray(data?.detail) && data.detail.length > 0) {
    const firstMsg = data.detail[0]?.msg;
    return typeof firstMsg === 'string'
      ? firstMsg.replace(/^Value error,\s*/i, '')
      : 'Please check your profile/resume and job description inputs.';
  }
  if (typeof data?.detail === 'string' && data.detail.trim()) {
    return data.detail;
  }
  return `Job Matcher service returned an unexpected error (HTTP ${status}).`;
}

export async function checkJobMatcherHealth({ signal } = {}) {
  const { signal: timedSignal, cleanup } = withTimeoutSignal(signal, AI_HEALTH_TIMEOUT_MS);
  try {
    const response = await fetch(`${JOB_MATCHER_API_URL}/health`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: timedSignal,
    });
    if (!response.ok) {
      return {
        reachable: true,
        ok: false,
        degraded: true,
        modelLoaded: false,
        error: 'Job Matcher service is degraded.',
      };
    }
    const data = await response.json();
    const modelLoaded = Boolean(data?.model_loaded);
    const isOk = data?.status === 'ok' && modelLoaded;
    return {
      reachable: true,
      ok: isOk,
      degraded: !isOk,
      status: data?.status || 'unknown',
      modelLoaded,
    };
  } catch {
    return {
      reachable: false,
      ok: false,
      degraded: false,
      modelLoaded: false,
      error: 'Job Matcher API is currently unavailable.',
    };
  } finally {
    cleanup();
  }
}

export async function matchProfileToJob(profile, job, { signal } = {}) {
  const { signal: timedSignal, didTimeout, cleanup } = withTimeoutSignal(
    signal,
    AI_SERVICE_TIMEOUT_MS
  );
  let response;
  try {
    response = await fetch(`${JOB_MATCHER_API_URL}/match`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ profile, job }),
      signal: timedSignal,
    });
  } catch (err) {
    cleanup();
    if (didTimeout() || err?.name === 'AbortError' || timedSignal.aborted) {
      const isUserAbort = Boolean(signal?.aborted) && !didTimeout();
      throw new JobMatcherApiError(
        isUserAbort
          ? 'Request cancelled.'
          : 'Job Matcher request timed out (the AI service may still be waking up). Please try again.',
        { status: null, code: isUserAbort ? 'ABORTED' : 'TIMEOUT' }
      );
    }
    throw new JobMatcherApiError(
      'Unable to reach the Job Matcher AI service right now. Please try again.',
      { status: null, code: 'NETWORK_ERROR' }
    );
  }
  cleanup();

  let data = null;
  try {
    data = await response.json();
  } catch {
    throw new JobMatcherApiError(
      'Received an invalid response from the Job Matcher service.',
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
    throw new JobMatcherApiError(extractApiErrorMessage(data, response.status), {
      status: response.status,
      code,
    });
  }

  if (
    !data ||
    typeof data !== 'object' ||
    data.valid !== true ||
    typeof data.overall_match_score !== 'number'
  ) {
    throw new JobMatcherApiError(
      'Received an incomplete job match response from the server.',
      { status: response.status, code: 'INVALID_RESPONSE' }
    );
  }

  return data;
}
