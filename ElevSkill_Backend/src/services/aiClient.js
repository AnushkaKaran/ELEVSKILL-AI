import { ApiError } from '../utils/ApiResponse.js';

export async function callAiJsonEndpoint({ serviceName, url, body, timeoutMs = 15000 }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort('timeout'), timeoutMs);

  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    if (err?.name === 'AbortError') {
      throw new ApiError(
        504,
        `${serviceName} timed out while processing your request. Please try again.`,
        'AI_SERVICE_TIMEOUT'
      );
    }
    throw new ApiError(
      503,
      `Unable to reach the ${serviceName} AI service right now. Please ensure it is running.`,
      'AI_SERVICE_UNAVAILABLE'
    );
  }

  clearTimeout(timer);

  let data = null;
  try {
    data = await response.json();
  } catch {
    throw new ApiError(
      502,
      `Received an invalid response from the ${serviceName} AI service.`,
      'AI_INVALID_RESPONSE'
    );
  }

  if (!response.ok) {
    const detail =
      typeof data?.detail === 'string'
        ? data.detail
        : Array.isArray(data?.detail) && data.detail[0]?.msg
          ? String(data.detail[0].msg).replace(/^Value error,\s*/i, '')
          : `${serviceName} service returned an error (HTTP ${response.status}).`;

    const code =
      response.status === 503
        ? 'AI_SERVICE_UNAVAILABLE'
        : response.status === 422 || response.status === 400
          ? 'AI_VALIDATION_ERROR'
          : 'AI_SERVICE_ERROR';

    throw new ApiError(response.status, detail, code);
  }

  return data;
}
