import { randomUUID } from 'node:crypto';
import { setTimeout as pause } from 'node:timers/promises';
import { performanceReport } from './demo-performance-report.mjs';

const vesselId = '5eed0001-0000-4000-8000-000000000001';
const scenario = [
  ['fleet', '/vessels?page=1'],
  ['compliance', `/vessels/${vesselId}/compliance`],
  ['crew-composition', `/vessels/${vesselId}/crew-composition`],
  ['maintenance', `/vessels/${vesselId}/maintenance-orders?page=1`],
];
const validPage = (body) =>
  body &&
  Number.isSafeInteger(body.total) &&
  body.total >= 0 &&
  Array.isArray(body.items);

export async function measureReads(options) {
  const startedAt = new Date().toISOString();
  const started = performance.now();
  const requests = [];
  const observed = {};
  let token;
  let budgetStop;
  const finish = (stopReason) => {
    token = undefined;
    return performanceReport({
      options,
      startedAt,
      durationMs: performance.now() - started,
      requests,
      observed,
      stopReason: budgetStop ?? stopReason,
    });
  };
  const unexpected = () => {
    requests.at(-1).error = 'UNEXPECTED_RESPONSE';
    return finish('bootstrap-failed');
  };
  async function request(name, path, phase = 'bootstrap', method = 'GET', payload) {
    if (performance.now() - started >= options.durationMs) {
      budgetStop = 'duration-budget';
      return undefined;
    }
    if (requests.length >= 30) {
      budgetStop = 'request-budget';
      return undefined;
    }
    const correlationId = `measurement-${randomUUID()}`;
    const begin = performance.now();
    const sample = {
      name,
      method,
      path,
      phase,
      status: null,
      durationMs: 0,
      correlationId,
      correlationEcho: false,
      error: null,
    };
    requests.push(sample);
    const signal = AbortSignal.timeout(
      Math.max(
        1,
        Math.ceil(
          Math.min(options.requestTimeoutMs, options.durationMs - (begin - started)),
        ),
      ),
    );
    try {
      const response = await fetch(`${options.apiBase}${path}`, {
        method,
        headers: {
          'x-correlation-id': correlationId,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(payload ? { 'Content-Type': 'application/json' } : {}),
        },
        ...(payload ? { body: JSON.stringify(payload) } : {}),
        redirect: 'error',
        signal,
      });
      sample.status = response.status;
      sample.correlationEcho = response.headers.get('x-correlation-id') === correlationId;
      const text = await response.text();
      sample.durationMs = Number((performance.now() - begin).toFixed(2));
      if (!response.ok) {
        sample.error = 'HTTP_ERROR';
        return undefined;
      }
      try {
        const body = JSON.parse(text);
        if (!body || typeof body !== 'object' || Array.isArray(body)) {
          sample.error = 'UNEXPECTED_RESPONSE';
          return undefined;
        }
        return body;
      } catch {
        sample.error = 'INVALID_JSON';
        return undefined;
      }
    } catch {
      sample.durationMs = Number((performance.now() - begin).toFixed(2));
      sample.error = signal.aborted ? 'TIMEOUT' : 'NETWORK_ERROR';
      if (performance.now() - started >= options.durationMs)
        budgetStop = 'duration-budget';
      return undefined;
    }
  }
  if (!(await request('liveness', '/health/live'))) return finish('bootstrap-failed');
  const readiness = await request('readiness', '/health/ready');
  if (!readiness) return finish('bootstrap-failed');
  if (['postgresql', 'memory'].includes(readiness.accessStore))
    observed.accessStore = readiness.accessStore;
  const availability = await request('availability', '/access/demo');
  if (!availability) return finish('bootstrap-failed');
  if (
    !Array.isArray(availability.availableRoles) ||
    !availability.availableRoles.includes(options.role)
  )
    return unexpected();
  const session = await request('session', '/access/demo/sessions', 'bootstrap', 'POST', {
    role: options.role,
  });
  if (!session) return finish('bootstrap-failed');
  if (
    typeof session.accessToken !== 'string' ||
    !session.accessToken.length ||
    session.accessToken.length > 8192
  )
    return unexpected();
  token = session.accessToken;
  const profile = await request('profile', '/access/me');
  if (!profile) return finish('bootstrap-failed');
  const expectedRole = options.role === 'auditor' ? 'AUDITOR' : 'OPERATIONS_MANAGER';
  if (
    !Array.isArray(profile.roles) ||
    profile.roles.length !== 1 ||
    profile.roles[0] !== expectedRole
  )
    return unexpected();
  const crew = await request('crew-registry', '/crew-members?page=1');
  if (!crew) return finish('bootstrap-failed');
  if (!validPage(crew)) return unexpected();
  observed.crewTotal = crew.total;
  for (let round = 0; round < options.rounds; round += 1) {
    for (const [name, path] of scenario) {
      let body = await request(name, path, round === 0 ? 'first-pass' : 'subsequent');
      if (budgetStop) return finish(budgetStop);
      if (
        body &&
        (name === 'compliance' ? !Array.isArray(body.certificates) : !validPage(body))
      ) {
        requests.at(-1).error = 'UNEXPECTED_RESPONSE';
        body = undefined;
      }
      if (round === 0 && body) {
        if (name === 'fleet') observed.fleetTotal = body.total;
        if (name === 'compliance')
          observed.workspaceCertificates = body.certificates?.length;
        if (name === 'crew-composition') observed.currentCompositionTotal = body.total;
        if (name === 'maintenance') observed.workspaceMaintenanceTotal = body.total;
      }
      await pause(
        Math.max(0, Math.min(250, options.durationMs - (performance.now() - started))),
      );
    }
  }
  return finish('completed');
}
