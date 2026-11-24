import { AI_HEALTH_TIMEOUT_MS, AI_SERVICE_TIMEOUT_MS, withTimeoutSignal } from './apiTimeout';

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
  const { signal: timedSignal, cleanup } = withTimeoutSignal(signal, AI_HEALTH_TIMEOUT_MS);
  try {
    const response = await fetch(`${INTERVIEW_COACH_API_URL}/health`, {
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
  } finally {
    cleanup();
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

  const { signal: timedSignal, didTimeout, cleanup } = withTimeoutSignal(
    signal,
    AI_SERVICE_TIMEOUT_MS
  );
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
      signal: timedSignal,
    });
  } catch (err) {
    cleanup();
    if (didTimeout() || err?.name === 'AbortError' || timedSignal.aborted) {
      const isUserAbort = Boolean(signal?.aborted) && !didTimeout();
      throw new InterviewCoachApiError(
        isUserAbort
          ? 'Request cancelled.'
          : 'Interview Coach request timed out (the AI service may still be waking up). Please try again.',
        { status: null, code: isUserAbort ? 'ABORTED' : 'TIMEOUT' }
      );
    }
    throw new InterviewCoachApiError(
      'Unable to reach the Interview Coach AI service right now. Please try again.',
      { status: null, code: 'NETWORK_ERROR' }
    );
  }
  cleanup();

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
