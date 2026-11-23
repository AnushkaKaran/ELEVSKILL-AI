import { apiRequest, getAuthToken } from './apiClient.js';

export const CAREER_ROADMAP_API_URL = (
  import.meta.env.VITE_CAREER_ROADMAP_API_URL || 'http://127.0.0.1:8004'
).replace(/\/+$/, '');

export class CareerRoadmapApiError extends Error {
  constructor(message, { status = null, code = 'API_ERROR' } = {}) {
    super(message);
    this.name = 'CareerRoadmapApiError';
    this.status = status;
    this.code = code;
  }
}

function extractApiErrorMessage(data, status) {
  if (status === 503) {
    return 'The Career Roadmap AI service is currently unavailable. Please try again shortly.';
  }
  if (status === 422 && Array.isArray(data?.detail) && data.detail.length > 0) {
    const firstMsg = data.detail[0]?.msg;
    return typeof firstMsg === 'string'
      ? firstMsg.replace(/^Value error,\s*/i, '')
      : 'Please check your target role and profile inputs.';
  }
  if (typeof data?.detail === 'string' && data.detail.trim()) {
    return data.detail;
  }
  return `Career Roadmap service returned an unexpected error (HTTP ${status}).`;
}

function withTimeoutSignal(externalSignal, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort('timeout'), timeoutMs);
  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort(externalSignal.reason);
    } else {
      externalSignal.addEventListener(
        'abort',
        () => controller.abort(externalSignal.reason),
        { once: true }
      );
    }
  }
  return {
    signal: controller.signal,
    cleanup: () => clearTimeout(timer),
  };
}

export async function checkCareerRoadmapHealth({ signal } = {}) {
  const { signal: timedSignal, cleanup } = withTimeoutSignal(signal, 8000);
  try {
    const response = await fetch(`${CAREER_ROADMAP_API_URL}/health`, {
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
        engineReady: false,
        error: 'Career Roadmap service is degraded.',
      };
    }
    const data = await response.json();
    const modelLoaded = Boolean(data?.model_loaded);
    const engineReady = Boolean(data?.engine_ready);
    const isOk = data?.status === 'ok' && modelLoaded && engineReady;
    return {
      reachable: true,
      ok: isOk,
      degraded: !isOk,
      status: data?.status || 'unknown',
      modelLoaded,
      engineReady,
    };
  } catch {
    return {
      reachable: false,
      ok: false,
      degraded: false,
      modelLoaded: false,
      engineReady: false,
      error: 'Career Roadmap API is currently unavailable.',
    };
  } finally {
    cleanup();
  }
}

export async function generateCareerRoadmap(requestData, { signal } = {}) {
  if (getAuthToken()) {
    try {
      const data = await apiRequest('/roadmap/generate', {
        method: 'POST',
        body: requestData,
        signal,
      });
      return data?.roadmap ?? data;
    } catch (err) {
      throw new CareerRoadmapApiError(err?.message || 'Career roadmap generation failed.', {
        status: err?.status || null,
        code: err?.code || 'API_ERROR',
      });
    }
  }

  const { signal: timedSignal, cleanup } = withTimeoutSignal(signal, 20000);
  let response;
  try {
    response = await fetch(`${CAREER_ROADMAP_API_URL}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(requestData),
      signal: timedSignal,
    });
  } catch (err) {
    cleanup();
    if (err?.name === 'AbortError' && signal?.aborted) {
      throw new CareerRoadmapApiError('Request cancelled.', {
        status: null,
        code: 'ABORTED',
      });
    }
    throw new CareerRoadmapApiError(
      'Unable to reach the Career Roadmap AI service right now. Please try again.',
      { status: null, code: 'NETWORK_ERROR' }
    );
  }

  cleanup();

  let data = null;
  try {
    data = await response.json();
  } catch {
    throw new CareerRoadmapApiError(
      'Received an invalid response from the Career Roadmap service.',
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
    throw new CareerRoadmapApiError(extractApiErrorMessage(data, response.status), {
      status: response.status,
      code,
    });
  }

  if (!data || typeof data !== 'object' || typeof data.valid !== 'boolean') {
    throw new CareerRoadmapApiError(
      'Received an incomplete roadmap response from the server.',
      { status: response.status, code: 'INVALID_RESPONSE' }
    );
  }

  return data;
}
