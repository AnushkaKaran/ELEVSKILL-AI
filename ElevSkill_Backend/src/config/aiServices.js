import { env } from './environment.js';

export const AI_SERVICE_CONFIG = {
  resumeAnalyzer: {
    name: 'Resume Analyzer',
    baseUrl: env.aiServices.resumeAnalyzerUrl,
    healthPath: '/health',
    timeoutMs: 15000,
  },
  interviewCoach: {
    name: 'Interview Coach',
    baseUrl: env.aiServices.interviewCoachUrl,
    healthPath: '/health',
    timeoutMs: 15000,
  },
  jobMatcher: {
    name: 'Job Matcher',
    baseUrl: env.aiServices.jobMatcherUrl,
    healthPath: '/health',
    timeoutMs: 15000,
  },
  careerRoadmap: {
    name: 'Career Roadmap',
    baseUrl: env.aiServices.careerRoadmapUrl,
    healthPath: '/health',
    timeoutMs: 20000,
  },
};

export async function checkSingleAiServiceHealth(serviceKey, timeoutMs = 4000) {
  const cfg = AI_SERVICE_CONFIG[serviceKey];
  if (!cfg) {
    return { status: 'unknown', reachable: false, ok: false };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort('timeout'), timeoutMs);

  try {
    const response = await fetch(`${cfg.baseUrl}${cfg.healthPath}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });

    if (!response.ok) {
      return {
        name: cfg.name,
        url: cfg.baseUrl,
        reachable: true,
        ok: false,
        status: 'degraded',
        httpStatus: response.status,
      };
    }

    const data = await response.json();
    const modelLoaded = Boolean(data?.model_loaded);
    const isOk = data?.status === 'ok' && modelLoaded;

    return {
      name: cfg.name,
      url: cfg.baseUrl,
      reachable: true,
      ok: isOk,
      status: isOk ? 'ok' : 'degraded',
      modelLoaded,
    };
  } catch {
    return {
      name: cfg.name,
      url: cfg.baseUrl,
      reachable: false,
      ok: false,
      status: 'unavailable',
      modelLoaded: false,
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function checkAllAiServicesHealth() {
  const entries = await Promise.all(
    Object.keys(AI_SERVICE_CONFIG).map(async (key) => [key, await checkSingleAiServiceHealth(key)])
  );
  return Object.fromEntries(entries);
}
