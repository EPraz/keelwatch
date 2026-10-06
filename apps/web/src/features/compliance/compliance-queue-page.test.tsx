import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CurrentUser } from '../../access/current-user.types';
import { AuthSessionContext } from '../../auth/auth-context';
import { ComplianceQueuePage } from './compliance-queue-page';
import type { ComplianceQueuePage as QueuePage } from './compliance.types';

const auditor: CurrentUser = {
  id: '00000000-0000-4000-8000-000000000002',
  displayName: 'Avery Chen',
  email: 'avery.chen@example.test',
  roles: ['AUDITOR'],
  permissions: ['fleet:read'],
};

function renderQueue(entry = '/app/compliance') {
  function TestShell() {
    return <Outlet context={{ user: auditor }} />;
  }
  return render(
    <AuthSessionContext.Provider
      value={{
        status: 'authenticated',
        mode: 'local',
        signIn: () => Promise.resolve(),
        signOut: () => Promise.resolve(),
        getAccessToken: () => Promise.resolve('local.test-token'),
      }}
    >
      <MemoryRouter initialEntries={[entry]}>
        <Routes>
          <Route path="/app" element={<TestShell />}>
            <Route path="compliance" element={<ComplianceQueuePage />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthSessionContext.Provider>,
  );
}

function queueResponse(overrides: Partial<QueuePage> = {}): Response {
  return new Response(
    JSON.stringify({
      asOf: '2026-10-04',
      items: [],
      counts: { MISSING: 0, EXPIRED: 0, EXPIRING_SOON: 0, VALID: 0 },
      totalVessels: 0,
      page: 1,
      pageSize: 20,
      total: 0,
      totalPages: 0,
      ...overrides,
    }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  );
}

function requestUrl(input: RequestInfo | URL): string {
  return typeof input === 'string'
    ? input
    : input instanceof URL
      ? input.href
      : input.url;
}

function queueApi(queue: Response) {
  return vi
    .fn()
    .mockImplementation((input: RequestInfo | URL) =>
      Promise.resolve(
        requestUrl(input).includes('/compliance/notifications')
          ? Response.json({ items: [], total: 0, latestRun: null })
          : queue.clone(),
      ),
    );
}

afterEach(() => vi.unstubAllGlobals());

describe('ComplianceQueuePage', () => {
  it('shows a traceable risk queue to an Auditor without accessibility violations', async () => {
    vi.stubGlobal(
      'fetch',
      queueApi(
        queueResponse({
          items: [
            {
              vessel: {
                id: '10000000-0000-4000-8000-000000000001',
                name: 'MV Northwind',
                registryNumber: 'KW-000001',
              },
              status: 'MISSING',
              reason: 'Safety equipment certificate is missing.',
              nextExpiryOn: null,
            },
          ],
          counts: { MISSING: 1, EXPIRED: 0, EXPIRING_SOON: 0, VALID: 0 },
          totalVessels: 1,
          total: 1,
          totalPages: 1,
        }),
      ),
    );
    renderQueue();

    expect(
      await screen.findByRole('heading', { name: '1 vessel matches' }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'MV Northwind' })).toHaveLength(2);
    expect(screen.getAllByText('Safety equipment certificate is missing.')).toHaveLength(
      2,
    );
    const accessibility = await axe.run(document.body, {
      rules: { 'color-contrast': { enabled: false } },
    });
    expect(accessibility.violations).toEqual([]);
  });

  it('writes combined filters to the URL-backed API query', async () => {
    const fetchMock = queueApi(queueResponse());
    vi.stubGlobal('fetch', fetchMock);
    renderQueue();
    await screen.findByRole('heading', { name: 'No active vessels to assess.' });

    await userEvent.type(screen.getByLabelText('Search vessel'), 'northwind');
    await userEvent.selectOptions(screen.getByLabelText('Status'), 'MISSING');
    await userEvent.click(screen.getByRole('button', { name: 'Apply filters' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    expect(
      fetchMock.mock.calls
        .map((call) => requestUrl(call[0] as RequestInfo | URL))
        .some((url) => url.includes('status=MISSING&search=northwind')),
    ).toBe(true);
  });

  it('explains a filtered empty result and offers a reset', async () => {
    vi.stubGlobal(
      'fetch',
      queueApi(
        queueResponse({
          counts: { MISSING: 1, EXPIRED: 0, EXPIRING_SOON: 0, VALID: 0 },
          totalVessels: 1,
        }),
      ),
    );
    renderQueue('/app/compliance?status=VALID');

    expect(
      await screen.findByRole('heading', { name: 'No vessels match these filters.' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Clear filters' })).toHaveAttribute(
      'href',
      '/app/compliance',
    );
  });
});
