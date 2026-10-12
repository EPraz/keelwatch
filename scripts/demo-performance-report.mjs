import { platform, arch } from 'node:os';

const statistics = (requests) => {
  const values = requests
    .map((item) => item.durationMs)
    .sort((left, right) => left - right);
  if (!values.length) return { count: 0 };
  return {
    count: values.length,
    minMs: values[0],
    p50Ms: values[Math.ceil(values.length * 0.5) - 1],
    p95Ms: values[Math.ceil(values.length * 0.95) - 1],
    maxMs: values.at(-1),
  };
};

export function performanceReport({
  options,
  startedAt,
  durationMs,
  requests,
  observed,
  stopReason,
}) {
  const workflows = [...new Set(requests.map((item) => item.name))].map((name) => ({
    name,
    firstPass: statistics(
      requests.filter((item) => item.name === name && item.phase === 'first-pass'),
    ),
    subsequent: statistics(
      requests.filter((item) => item.name === name && item.phase === 'subsequent'),
    ),
    bootstrap: statistics(
      requests.filter((item) => item.name === name && item.phase === 'bootstrap'),
    ),
  }));
  return {
    startedAt,
    apiBase: options.apiBase,
    role: options.role,
    environment: { node: process.version, os: platform(), architecture: arch() },
    budget: {
      concurrency: 1,
      maxRequests: 30,
      maxDurationMs: options.durationMs,
      requestTimeoutMs: options.requestTimeoutMs,
      rounds: options.rounds,
      intervalMs: 250,
      retries: 0,
    },
    timing:
      'performance.now(): fetch start through full response body; client network/DNS/TLS included, JSON parsing excluded; nearest-rank percentiles',
    coldStart:
      'Not established. Bootstrap may wake API/database before scenario reads. First pass is not proof of a cold start.',
    dataset: {
      baseline: { operationalRecords: 33, source: 'docs/flagship/DEMO_DATASET.md' },
      observed,
    },
    durationMs: Number(durationMs.toFixed(2)),
    stopReason,
    summary: {
      attempted: requests.length,
      planned: 6 + 4 * options.rounds,
      unattempted: 6 + 4 * options.rounds - requests.length,
      failed: requests.filter((item) => item.error !== null).length,
      latency: statistics(requests),
    },
    workflows,
    requests,
  };
}
