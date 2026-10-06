import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CurrentUser } from '../../access/current-user.types';
import { AuthSessionContext } from '../../auth/auth-context';
import { VesselDetailPage } from './vessel-detail-page';

const manager: CurrentUser = {
  id: '00000000-0000-4000-8000-000000000001',
  displayName: 'Morgan Reed',
  email: 'morgan.reed@example.test',
  roles: ['OPERATIONS_MANAGER'],
  permissions: ['fleet:read', 'fleet:write'],
};

const auditor: CurrentUser = {
  ...manager,
  id: '00000000-0000-4000-8000-000000000002',
  displayName: 'Avery Chen',
  roles: ['AUDITOR'],
  permissions: ['fleet:read'],
};

const vesselId = '10000000-0000-4000-8000-000000000001';
const detail = {
  id: vesselId,
  name: 'MV Northwind',
  registryNumber: 'KW-000001',
  status: 'ACTIVE',
  createdAt: '2026-10-02T12:00:00.000Z',
  updatedAt: '2026-10-02T13:00:00.000Z',
  activity: [
    {
      id: '20000000-0000-4000-8000-000000000001',
      action: 'VESSEL_UPDATED',
      actorDisplayName: 'Morgan Reed',
      occurredAt: '2026-10-02T13:00:00.000Z',
      changedFields: ['name'],
    },
  ],
};

const compliance = {
  asOf: '2026-10-03',
  status: 'MISSING',
  reason: 'Safety equipment certificate is missing.',
  requirements: [
    {
      certificateType: {
        code: 'SAFETY_EQUIPMENT',
        name: 'Safety equipment certificate',
        isRequired: true,
      },
      status: 'MISSING',
      reason: 'Safety equipment certificate is missing.',
      certificate: null,
    },
  ],
  certificates: [],
  certificateTypes: [
    {
      code: 'SAFETY_EQUIPMENT',
      name: 'Safety equipment certificate',
      isRequired: true,
    },
  ],
};

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

function stubWorkspaceFetch() {
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL) =>
      Promise.resolve(
        Response.json(requestUrl(input).endsWith('/compliance') ? compliance : detail),
      ),
    ),
  );
}

function renderDetail(user: CurrentUser) {
  function TestShell() {
    return <Outlet context={{ user }} />;
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
      <MemoryRouter initialEntries={[`/app/vessels/${vesselId}`]}>
        <Routes>
          <Route path="/app" element={<TestShell />}>
            <Route path="vessels/:vesselId" element={<VesselDetailPage />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthSessionContext.Provider>,
  );
}

afterEach(() => vi.unstubAllGlobals());

describe('VesselDetailPage', () => {
  it('shows current data, activity, and an edit action to a manager', async () => {
    stubWorkspaceFetch();
    renderDetail(manager);

    expect(
      await screen.findByRole('heading', { name: 'MV Northwind' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Vessel details updated')).toBeInTheDocument();
    expect(screen.getByText('Changed: name')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Edit vessel' })).toBeInTheDocument();
    const accessibility = await axe.run(document.body, {
      rules: { 'color-contrast': { enabled: false } },
    });
    expect(accessibility.violations).toEqual([]);
  });

  it('shows the same activity read-only to an Auditor', async () => {
    stubWorkspaceFetch();
    renderDetail(auditor);

    expect(
      await screen.findByRole('heading', { name: 'MV Northwind' }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { name: 'Evidence is visible, not editable.' }),
    ).toBeInTheDocument();
    expect(screen.getAllByText('Read-only watch')).toHaveLength(2);
    expect(screen.queryByRole('link', { name: 'Edit vessel' })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Record certificate' }),
    ).not.toBeInTheDocument();
  });

  it('renders a stable not-found state', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          Response.json(
            { code: 'VESSEL_NOT_FOUND', message: 'The requested vessel was not found.' },
            { status: 404 },
          ),
        ),
    );
    renderDetail(auditor);

    expect(
      await screen.findByRole('heading', { name: 'Vessel not found.' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Return to Fleet' })).toBeInTheDocument();
  });

  it('keeps a persistent failure and recovers through retry', async () => {
    let detailAttempts = 0;
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      if (requestUrl(input).endsWith('/compliance')) {
        return Promise.resolve(Response.json(compliance));
      }
      detailAttempts += 1;
      return detailAttempts === 1
        ? Promise.reject(new TypeError('Network unavailable'))
        : Promise.resolve(Response.json(detail));
    });
    vi.stubGlobal('fetch', fetchMock);
    renderDetail(auditor);

    expect(
      await screen.findByRole('heading', { name: 'This vessel could not load.' }),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(
      await screen.findByRole('heading', { name: 'MV Northwind' }),
    ).toBeInTheDocument();
    expect(detailAttempts).toBe(2);
  });
});
