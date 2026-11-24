import { getGenerativeModel, InferenceMode, InferenceSource } from 'firebase/ai';
import { FirebaseConfigError, getFirebaseServices } from '../config/firebase.js';

const DEFAULT_CLOUD_MODEL = (
  import.meta.env.VITE_FIREBASE_AI_CLOUD_MODEL || 'gemini-3.5-flash-lite'
).trim();

const REQUEST_TIMEOUT_MS = 25000;
const ON_DEVICE_FALLBACK_TIMEOUT_MS = 10000;

const CONCISE_SYSTEM_INSTRUCTION =
  'You are a concise career preparation assistant for ELEVSKILL AI. ' +
  'Keep ordinary answers practical, direct, and around 150-200 words. ' +
  'Do not escape markdown characters with backslashes.';

export class FirebaseAiServiceError extends Error {
  constructor(message, { code = 'FIREBASE_AI_ERROR' } = {}) {
    super(message);
    this.name = 'FirebaseAiServiceError';
    this.code = code;
  }
}

function normalizeInferenceSource(rawSource) {
  if (rawSource === InferenceSource.ON_DEVICE || rawSource === 'on_device') {
    return 'ON_DEVICE';
  }
  if (rawSource === InferenceSource.IN_CLOUD || rawSource === 'in_cloud') {
    return 'IN_CLOUD';
  }
  return 'UNKNOWN';
}

let cachedCloudModel = null;
let cachedOnDeviceModel = null;
let cachedModelAiRef = null;
let cachedModelName = null;
let inFlightRequest = null;

function getOrCreateCloudModel(ai) {
  if (cachedCloudModel && cachedModelAiRef === ai && cachedModelName === DEFAULT_CLOUD_MODEL) {
    return cachedCloudModel;
  }

  cachedCloudModel = getGenerativeModel(
    ai,
    {
      mode: InferenceMode.ONLY_IN_CLOUD,
      inCloudParams: {
        model: DEFAULT_CLOUD_MODEL,
        systemInstruction: CONCISE_SYSTEM_INSTRUCTION,
        generationConfig: {
          maxOutputTokens: 320,
        },
      },
    },
    { timeout: REQUEST_TIMEOUT_MS }
  );
  cachedModelAiRef = ai;
  cachedModelName = DEFAULT_CLOUD_MODEL;
  return cachedCloudModel;
}

function getOrCreateOnDeviceModel(ai) {
  if (cachedOnDeviceModel && cachedModelAiRef === ai) {
    return cachedOnDeviceModel;
  }

  cachedOnDeviceModel = getGenerativeModel(
    ai,
    {
      mode: InferenceMode.ONLY_ON_DEVICE,
      onDeviceParams: {
        createOptions: {
          initialPrompts: [{ role: 'system', content: CONCISE_SYSTEM_INSTRUCTION }],
        },
      },
    },
    { timeout: ON_DEVICE_FALLBACK_TIMEOUT_MS }
  );
  return cachedOnDeviceModel;
}

function raceWithTimeout(promise, timeoutMs, controller, onTimeout) {
  let timer;
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => {
      onTimeout();
      controller.abort('timeout');
      const err = new Error('The AI request timed out.');
      err.name = 'AbortError';
      reject(err);
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timer);
  });
}

export async function generateHybridPromptResponse(promptText, { signal: externalSignal } = {}) {
  const cleanPrompt = typeof promptText === 'string' ? promptText.trim() : '';
  if (!cleanPrompt) {
    throw new FirebaseAiServiceError('Please enter a prompt before generating a response.', {
      code: 'VALIDATION_ERROR',
    });
  }

  if (inFlightRequest) {
    throw new FirebaseAiServiceError('A response is already being generated. Please wait.', {
      code: 'REQUEST_IN_FLIGHT',
    });
  }

  let services;
  try {
    services = getFirebaseServices();
  } catch (err) {
    if (err instanceof FirebaseConfigError) {
      throw new FirebaseAiServiceError(err.message, { code: 'CONFIG_MISSING' });
    }
    throw new FirebaseAiServiceError('Failed to initialize Firebase AI Logic.', {
      code: 'INIT_ERROR',
    });
  }

  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort('timeout');
  }, REQUEST_TIMEOUT_MS);

  if (externalSignal) {
    if (externalSignal.aborted) {
      clearTimeout(timer);
      throw new FirebaseAiServiceError('Request cancelled.', { code: 'ABORTED' });
    }
    externalSignal.addEventListener('abort', () => controller.abort(externalSignal.reason), {
      once: true,
    });
  }

  const runPromise = (async () => {
    try {
      const cloudModel = getOrCreateCloudModel(services.ai);
      let result;
      try {
        result = await raceWithTimeout(
          cloudModel.generateContent(cleanPrompt, {
            signal: controller.signal,
            timeout: REQUEST_TIMEOUT_MS,
          }),
          REQUEST_TIMEOUT_MS,
          controller,
          () => {
            timedOut = true;
          }
        );
      } catch (cloudErr) {
        const cloudMsg = typeof cloudErr?.message === 'string' ? cloudErr.message : '';
        const shouldTryOnDevice =
          !timedOut &&
          !externalSignal?.aborted &&
          !/app\s*check|recaptcha|403/i.test(cloudMsg) &&
          /network|failed to fetch|offline|ERR_INTERNET_DISCONNECTED/i.test(cloudMsg);

        if (!shouldTryOnDevice) {
          throw cloudErr;
        }

        const onDeviceModel = getOrCreateOnDeviceModel(services.ai);
        result = await raceWithTimeout(
          onDeviceModel.generateContent(cleanPrompt, {
            signal: controller.signal,
            timeout: ON_DEVICE_FALLBACK_TIMEOUT_MS,
          }),
          ON_DEVICE_FALLBACK_TIMEOUT_MS,
          controller,
          () => {
            timedOut = true;
          }
        );
      }

      const response = result?.response;
      const text = typeof response?.text === 'function' ? response.text() : '';

      if (!text || !text.trim()) {
        throw new FirebaseAiServiceError('Firebase AI Logic returned an empty response.', {
          code: 'EMPTY_RESPONSE',
        });
      }

      return {
        text: text.trim(),
        inferenceSource: normalizeInferenceSource(response?.inferenceSource),
        cloudModel: DEFAULT_CLOUD_MODEL,
        appCheckInitialized: services.appCheckConfigured,
      };
    } catch (err) {
      if (err instanceof FirebaseAiServiceError) {
        throw err;
      }
      const rawMsg = typeof err?.message === 'string' ? err.message : '';
      if (timedOut || err?.name === 'AbortError' || /timeout|timed out/i.test(rawMsg)) {
        throw new FirebaseAiServiceError(
          'The AI request timed out before on-device or cloud Gemini could finish. Please try a shorter prompt or try again.',
          { code: 'TIMEOUT' }
        );
      }
      if (/app\s*check|recaptcha|403/i.test(rawMsg)) {
        throw new FirebaseAiServiceError(
          'Firebase App Check verification failed. Ensure your reCAPTCHA Enterprise site key and local debug token are registered in Firebase Console.',
          { code: 'APP_CHECK_ERROR' }
        );
      }
      if (/network|failed to fetch|offline|ERR_INTERNET_DISCONNECTED/i.test(rawMsg)) {
        throw new FirebaseAiServiceError(
          'Unable to reach cloud Gemini fallback due to a network error. Check your connection and try again.',
          { code: 'NETWORK_ERROR' }
        );
      }
      if (/on[- ]device|prompt\s*api|gemini\s*nano|model.*unavailable|quota|429|503/i.test(rawMsg)) {
        throw new FirebaseAiServiceError(
          'On-device AI was unavailable and the cloud Gemini fallback could not complete right now. Please try again.',
          { code: 'FALLBACK_FAILED' }
        );
      }
      throw new FirebaseAiServiceError(
        rawMsg || 'Unable to generate a response from Firebase AI Logic right now.',
        { code: 'GENERATION_ERROR' }
      );
    } finally {
      clearTimeout(timer);
      inFlightRequest = null;
    }
  })();

  inFlightRequest = runPromise;
  return runPromise;
}
