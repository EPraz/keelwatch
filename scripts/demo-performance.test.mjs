import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { once } from 'node:events';
import test from 'node:test';
import { setTimeout as pause } from 'node:timers/promises';

const token = 'synthetic-session-for-local-http-test';
const vesselId = '5eed0001-0000-4000-8000-000000000001';
async function fixture(overrides = {}) {
  const requests = [];
  const server = createServer(async (request, response) => {
    requests.push({
      method: request.method,
      path: request.url,
      authorization: request.headers.authorization,
    });
    response.setHeader('Content-Type', 'application/json');
    response.setHeader('x-correlation-id', request.headers['x-correlation-id']);
    if (overrides.handle && (await overrides.handle(request, response))) return;
    if (request.url.endsWith('/sessions')) {
      response.statusCode = 201;
      response.end(JSON.stringify({ accessToken: token }));
    } else if (request.url.endsWith('/me')) {
      response.end(JSON.stringify({ roles: ['AUDITOR'] }));
    } else if (request.url.includes('/compliance')) {
      response.end(
        JSON.stringify({ status: 'VALID', certificates: [{ id: 'synthetic-cert' }] }),
      );
    } else if (request.url.includes('/health/')) {
      response.end(JSON.stringify({ status: 'ok' }));
    } else if (request.url.endsWith('/access/demo')) {
      response.end(
        JSON.stringify({ enabled: true, availableRoles: ['manager', 'auditor'] }),
      );
    } else {
      response.end(JSON.stringify({ total: 5, items: [] }));
    }
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  const base = `http://127.0.0.1:${address.port}/api/v1`;
  const run = (args = []) =>
    new Promise((resolve, reject) => {
      const child = spawn(
        process.execPath,
        ['scripts/demo-performance.mjs', '--api-base', base, ...args],
        { stdio: ['ignore', 'pipe', 'pipe'] },
      );
      let stdout = '';
      let stderr = '';
      child.stdout.on('data', (chunk) => {
        stdout += chunk;
      });
      child.stderr.on('data', (chunk) => {
        stderr += chunk;
      });
      child.on('error', reject);
      child.on('close', (code) => resolve({ code, stdout, stderr }));
    });
  return {
    requests,
    run,
    close: () =>
      new Promise((resolve) => {
        server.closeAllConnections();
        server.close(resolve);
      }),
  };
}

test('CLI measures protected public read workflows with a temporary issued session and separates first and later samples', async () => {
  const api = await fixture();
  try {
    const result = await api.run(['--rounds', '2']);
    assert.equal(result.code, 0, result.stderr);
    const report = JSON.parse(result.stdout);
    assert.equal(report.role, 'auditor');
    assert.equal(report.budget.concurrency, 1);
    assert.equal(report.requests.length, 14);
    assert.equal(report.summary.failed, 0);
    assert.equal(report.requests.filter((item) => item.phase === 'first-pass').length, 4);
    assert.equal(report.requests.filter((item) => item.phase === 'subsequent').length, 4);
    assert.equal(report.dataset.observed.fleetTotal, 5);
    const protectedRequests = api.requests.filter((item) =>
      item.path.includes(`/vessels/${vesselId}`),
    );
    assert.equal(protectedRequests.length, 6);
    assert.ok(
      protectedRequests.every((item) => item.authorization === `Bearer ${token}`),
    );
    assert.deepEqual(
      api.requests.filter((item) => item.method !== 'GET').map((item) => item.path),
      ['/api/v1/access/demo/sessions'],
    );
    assert.equal(result.stdout.includes(token), false);
    assert.equal(result.stderr.includes(token), false);
  } finally {
    await api.close();
  }
});

test('CLI retains HTTP failures and their timing without echoing unsafe server bodies or retrying writes', async () => {
  const api = await fixture({
    handle: async (request, response) => {
      if (!request.url.includes('/compliance')) return false;
      await pause(40);
      response.statusCode = 503;
      response.end(JSON.stringify({ message: `private details ${token}` }));
      return true;
    },
  });
  try {
    const result = await api.run(['--rounds', '1']);
    assert.equal(result.code, 1);
    const report = JSON.parse(result.stdout);
    assert.equal(report.summary.attempted, 10);
    assert.equal(report.summary.failed, 1);
    const failed = report.requests.find((item) => item.status === 503);
    assert.equal(failed.error, 'HTTP_ERROR');
    assert.ok(failed.durationMs >= 30);
    assert.equal(
      report.workflows.find((item) => item.name === 'compliance').firstPass.count,
      1,
    );
    assert.equal(result.stdout.includes(token), false);
    assert.equal(result.stderr.includes(token), false);
    assert.equal(api.requests.filter((item) => item.method === 'POST').length, 1);
  } finally {
    await api.close();
  }
});

test('CLI reports rejected issuance and stops before protected reads instead of hiding the failure', async () => {
  const api = await fixture({
    handle: async (request, response) => {
      if (!request.url.endsWith('/sessions')) return false;
      response.statusCode = 429;
      response.end(JSON.stringify({ message: token }));
      return true;
    },
  });
  try {
    const result = await api.run(['--rounds', '1']);
    assert.equal(result.code, 1);
    const report = JSON.parse(result.stdout);
    assert.equal(report.stopReason, 'bootstrap-failed');
    assert.equal(report.requests.length, 4);
    assert.equal(report.summary.failed, 1);
    assert.equal(report.requests.at(-1).status, 429);
    assert.equal(
      api.requests.some((item) => item.path.includes('/vessels')),
      false,
    );
    assert.equal(result.stdout.includes(token), false);
  } finally {
    await api.close();
  }
});

test('CLI bounds the whole run and includes an aborted request in the partial report', async () => {
  const api = await fixture({
    handle: async (_request, response) => {
      await pause(400);
      response.end('{}');
      return true;
    },
  });
  try {
    const result = await api.run(['--duration-ms', '120']);
    assert.equal(result.code, 1);
    const report = JSON.parse(result.stdout);
    assert.equal(report.stopReason, 'duration-budget');
    assert.equal(report.requests.length, 1);
    assert.equal(report.summary.failed, 1);
    assert.equal(report.requests[0].error, 'TIMEOUT');
    assert.ok(report.durationMs < 500);
    assert.equal(api.requests.length, 1);
  } finally {
    await api.close();
  }
});

test('CLI rejects malformed dataset counts without copying server values into its report', async () => {
  const api = await fixture({
    handle: async (request, response) => {
      if (!request.url.includes('/crew-members')) return false;
      response.end(JSON.stringify({ total: token, items: [] }));
      return true;
    },
  });
  try {
    const result = await api.run(['--rounds', '1']);
    assert.equal(result.code, 1);
    const report = JSON.parse(result.stdout);
    assert.equal(report.summary.failed, 1);
    assert.equal(report.requests.at(-1).error, 'UNEXPECTED_RESPONSE');
    assert.equal(report.stopReason, 'bootstrap-failed');
    assert.equal(result.stdout.includes(token), false);
    assert.equal(result.stderr.includes(token), false);
  } finally {
    await api.close();
  }
});

test('CLI times the complete body and reports per-request timeout, invalid JSON and network failures', async () => {
  for (const mode of ['slow-body', 'invalid-json', 'network']) {
    const api = await fixture({
      handle: async (request, response) => {
        if (!request.url.includes('/compliance')) return false;
        if (mode === 'slow-body') {
          response.write('{"certificates":');
          await pause(300);
          response.end('[]}');
        } else if (mode === 'invalid-json') response.end(token);
        else response.destroy(new Error(token));
        return true;
      },
    });
    try {
      const result = await api.run(['--rounds', '1', '--request-timeout-ms', '150']);
      assert.equal(result.code, 1);
      const report = JSON.parse(result.stdout);
      assert.equal(report.summary.failed, 1);
      const failed = report.requests.find((item) => item.name === 'compliance');
      assert.equal(
        failed.error,
        {
          'slow-body': 'TIMEOUT',
          'invalid-json': 'INVALID_JSON',
          network: 'NETWORK_ERROR',
        }[mode],
      );
      if (mode === 'slow-body') {
        assert.equal(failed.status, 200);
        assert.ok(failed.durationMs >= 100);
      }
      assert.equal(result.stdout.includes(token), false);
      assert.equal(result.stderr.includes(token), false);
    } finally {
      await api.close();
    }
  }
});

test('CLI rejects unsafe targets or increased budgets before contacting HTTP', async () => {
  const api = await fixture();
  try {
    for (const args of [
      ['--rounds', '7'],
      ['--duration-ms', '180001'],
      ['--request-timeout-ms', '60001'],
      ['--role', 'administrator'],
      ['--concurrency', '2'],
      ['--api-base', 'https://name:private@example.com/api/v1'],
      ['--api-base', 'https://example.com/api/v1?token=private'],
      ['--api-base', 'http://example.com/api/v1'],
    ]) {
      const result = await api.run(args);
      assert.equal(result.code, 1);
      assert.equal(result.stdout, '');
      assert.equal(result.stderr.includes('private'), false);
    }
    assert.equal(api.requests.length, 0);
  } finally {
    await api.close();
  }
});

test('default run stays inside its 30-request budget and returns traceable correlations', async () => {
  const api = await fixture();
  try {
    const result = await api.run();
    assert.equal(result.code, 0);
    const report = JSON.parse(result.stdout);
    assert.equal(report.requests.length, 30);
    assert.equal(
      report.workflows.find((item) => item.name === 'fleet').subsequent.count,
      5,
    );
    assert.equal(
      report.workflows.find((item) => item.name === 'fleet').subsequent.maxMs,
      report.workflows.find((item) => item.name === 'fleet').subsequent.p95Ms,
    );
    assert.ok(report.requests.every((item) => item.correlationEcho));
    assert.equal(new Set(report.requests.map((item) => item.correlationId)).size, 30);
  } finally {
    await api.close();
  }
});

test('Manager selection is issued explicitly and a mismatched profile stops the read scenario', async () => {
  for (const profileRole of ['OPERATIONS_MANAGER', 'AUDITOR']) {
    let selectedRole;
    const api = await fixture({
      handle: async (request, response) => {
        if (request.url.endsWith('/sessions')) {
          let body = '';
          for await (const chunk of request) body += chunk;
          selectedRole = JSON.parse(body).role;
          response.statusCode = 201;
          response.end(JSON.stringify({ accessToken: token }));
          return true;
        }
        if (request.url.endsWith('/me')) {
          response.end(JSON.stringify({ roles: [profileRole] }));
          return true;
        }
        return false;
      },
    });
    try {
      const result = await api.run(['--role', 'manager', '--rounds', '1']);
      const report = JSON.parse(result.stdout);
      assert.equal(selectedRole, 'manager');
      assert.equal(report.role, 'manager');
      assert.equal(result.code, profileRole === 'OPERATIONS_MANAGER' ? 0 : 1);
      if (profileRole === 'AUDITOR') {
        assert.equal(report.summary.failed, 1);
        assert.equal(report.stopReason, 'bootstrap-failed');
        assert.equal(
          api.requests.some((item) => item.path.includes('/vessels')),
          false,
        );
      }
    } finally {
      await api.close();
    }
  }
});
