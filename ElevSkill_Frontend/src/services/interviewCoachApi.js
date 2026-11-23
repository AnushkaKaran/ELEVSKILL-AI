import { apiRequest, getAuthToken } from './apiClient.js';

export const INTERVIEW_COACH_API_URL = (
  import.meta.env.VITE_INTERVIEW_COACH_API_URL || 'http://127.0.0.1:8002'
).replace(/\/+$/, '');

export class InterviewCoachApiError extends Error {
  constructor(message, { status = null, code = 'API_ERROR' } = {}) {
    super(message);
    this.name = 'InterviewCoachApiError';
    this.status = status;
    this.code = code;
  }
}

function extractApiErrorMessage(data, status) {
  if (status === 503) {
    return 'The Interview Coach service is currently unavailable. Please start the service and try again.';
  }
  if (status === 422 && Array.isArray(data?.detail) && data.detail.length > 0) {
    const firstMsg = data.detail[0]?.msg;
    return typeof firstMsg === 'string'
      ? firstMsg.replace(/^Value error,\s*/i, '')
      : 'Please check your interview answer and category inputs.';
  }
  if (typeof data?.detail === 'string' && data.detail.trim()) {
    return data.detail;
  }
  return `Interview Coach service returned an unexpected error (HTTP ${status}).`;
}

export async function checkInterviewCoachHealth({ signal } = {}) {
  try {
    const response = await fetch(`${INTERVIEW_COACH_API_URL}/health`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal,
    });
    if (!response.ok) {
      return {
        reachable: true,
        ok: false,
        degraded: true,
        modelLoaded: false,
        error: 'Interview Coach service is degraded.',
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
      error: 'Interview Coach API is currently unavailable.',
    };
  }
}

export async function evaluateInterviewAnswer(
  answerText,
  category,
  questionReference = {},
  { signal } = {}
) {
  const questionId =
    typeof questionReference === 'string'
      ? questionReference
      : questionReference?.questionId || null;
  const questionText =
    typeof questionReference === 'object' && questionReference?.questionText
      ? questionReference.questionText
      : null;

  if (getAuthToken()) {
    try {
      const data = await apiRequest('/interviews/evaluate', {
        method: 'POST',
        body: {
          answerText,
          category,
          questionId,
          questionText,
        },
        signal,
      });
      return data?.evaluation ?? data;
    } catch (err) {
      throw new InterviewCoachApiError(err?.message || 'Interview evaluation failed.', {
        status: err?.status || null,
        code: err?.code || 'API_ERROR',
      });
    }
  }

  let response;
  try {
    response = await fetch(`${INTERVIEW_COACH_API_URL}/evaluate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        answer_text: answerText,
        category,
        question_id: questionId,
        question_text: questionText,
      }),
      signal,
    });
  } catch {
    throw new InterviewCoachApiError(
      'Unable to reach the Interview Coach AI service right now. Please try again.',
      { status: null, code: 'NETWORK_ERROR' }
    );
  }

  let data = null;
  try {
    data = await response.json();
  } catch {
    throw new InterviewCoachApiError(
      'Received an invalid response from the Interview Coach service.',
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
    throw new InterviewCoachApiError(extractApiErrorMessage(data, response.status), {
      status: response.status,
      code,
    });
  }

  if (
    !data ||
    typeof data !== 'object' ||
    data.valid !== true ||
    typeof data.overall_score !== 'number'
  ) {
    throw new InterviewCoachApiError(
      'Received an incomplete evaluation response from the server.',
      { status: response.status, code: 'INVALID_RESPONSE' }
    );
  }

  return data;
}
