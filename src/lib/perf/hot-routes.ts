export type PerfTimings = Record<string, number>;

function roundMs(value: number): number {
  return Math.round(value * 10) / 10;
}

export function isHotRoutePerfLoggingEnabled(): boolean {
  return process.env.PERF_LOG_HOT_ROUTES === "1" || process.env.NODE_ENV === "development";
}

export function elapsedMs(startedAt: number): number {
  return roundMs(performance.now() - startedAt);
}

export async function measurePerfStep<T>(
  timings: PerfTimings,
  label: string,
  operation: () => Promise<T>,
): Promise<T> {
  const startedAt = performance.now();

  try {
    return await operation();
  } finally {
    timings[label] = elapsedMs(startedAt);
  }
}

export function logHotRoutePerf(scope: string, payload: Record<string, unknown>): void {
  if (!isHotRoutePerfLoggingEnabled()) {
    return;
  }

  console.info(`[perf][${scope}] ${JSON.stringify(payload)}`);
}
