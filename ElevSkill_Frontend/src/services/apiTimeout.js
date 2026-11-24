export const AI_SERVICE_TIMEOUT_MS = 90000;
export const AI_HEALTH_TIMEOUT_MS = 15000;

export function withTimeoutSignal(externalSignal, timeoutMs = AI_SERVICE_TIMEOUT_MS) {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort('timeout');
  }, timeoutMs);

  const onAbort = () => controller.abort(externalSignal?.reason || 'aborted');

  if (externalSignal) {
    if (externalSignal.aborted) {
      clearTimeout(timer);
      controller.abort(externalSignal.reason || 'aborted');
    } else {
      externalSignal.addEventListener('abort', onAbort, { once: true });
    }
  }

  return {
    signal: controller.signal,
    didTimeout: () => timedOut,
    cleanup: () => {
      clearTimeout(timer);
      if (externalSignal) {
        externalSignal.removeEventListener('abort', onAbort);
      }
    },
  };
}
