import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthRoot } from './auth-root';
import { ProtectedRoute } from '../app/protected-route';
import { ToastProvider } from '../app/toast-provider';
import { AppShellPage } from '../pages/app-shell-page';
import { SignInPage } from '../pages/sign-in-page';
import { FleetPage } from '../features/fleet/fleet-page';
import { VesselCreatePage } from '../features/fleet/vessel-create-page';

function renderWorkspace(route = '/app/vessels') {
  return render(
    <AuthRoot>
      <ToastProvider>
        <MemoryRouter initialEntries={[route]}>
          <Routes>
            <Route path="/sign-in" element={<SignInPage />} />
            <Route element={<ProtectedRoute />}>
              <Route path="/app" element={<AppShellPage />}>
                <Route index element={<FleetPage />} />
                <Route path="vessels" element={<FleetPage />} />
                <Route path="vessels/new" element={<VesselCreatePage />} />
              </Route>
            </Route>
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    </AuthRoot>,
  );
}

function requestUrl(input: string | URL | Request): string {
  return input instanceof Request ? input.url : input.toString();
}

function configureApi(limitedWrite = false) {
  vi.stubEnv('VITE_AUTH_MODE', 'local');
  vi.stubEnv('PROD', false);
  let writeAttempts = 0;
  const vessels: object[] = [];
  const fetch = vi.fn((input: string | URL | Request, init?: RequestInit) => {
    const url = requestUrl(input);
    if (url.endsWith('/access/demo'))
      return Promise.resolve(Response.json({ availableRoles: ['manager', 'auditor'] }));
    if (url.endsWith('/access/demo/sessions')) {
      const { role } = JSON.parse(init?.body as string) as { role: string };
      return Promise.resolve(
        Response.json({
          accessToken: `demo.synthetic-${role}`,
          expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
        }),
      );
    }
    const authorization = new Headers(init?.headers).get('Authorization');
    const manager = authorization === 'Bearer demo.synthetic-manager';
    if (url.endsWith('/access/me'))
      return Promise.resolve(
        Response.json({
          id: manager ? 'synthetic-manager' : 'synthetic-auditor',
          displayName: manager ? 'Demo Manager' : 'Demo Auditor',
          roles: [manager ? 'OPERATIONS_MANAGER' : 'AUDITOR'],
          permissions: manager ? ['fleet:read', 'fleet:write'] : ['fleet:read'],
        }),
      );
    if (url.endsWith('/vessels') && init?.method === 'POST') {
      writeAttempts += 1;
      if (limitedWrite && writeAttempts === 1)
        return Promise.resolve(
          Response.json(
            {
              code: 'DEMO_WRITE_LIMITED',
              message:
                'Demo changes are busy. Try again in 60 seconds. Reading remains available.',
            },
            { status: 429 },
          ),
        );
      const vessel = {
        id: '10000000-0000-4000-8000-000000000013',
        ...(JSON.parse(init.body as string) as object),
        status: 'ACTIVE',
        createdAt: '2026-10-11T12:00:00.000Z',
      };
      vessels.push(vessel);
      return Promise.resolve(Response.json(vessel, { status: 201 }));
    }
    if (url.includes('/vessels?'))
      return Promise.resolve(
        Response.json({
          items: vessels,
          page: 1,
          pageSize: 20,
          total: vessels.length,
          totalPages: vessels.length ? 1 : 0,
        }),
      );
    return Promise.reject(new Error('Unexpected synthetic API request.'));
  });
  vi.stubGlobal('fetch', fetch);
  return fetch;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe('Demo Manager through the real Fleet screens', () => {
  it('clears Manager profile, permissions and an open draft before Auditor entry and reload', async () => {
    const fetch = configureApi();
    const first = renderWorkspace();
    await userEvent.click(await screen.findByRole('button', { name: /Demo Manager/i }));
    expect(await screen.findByText('Demo Manager')).toBeInTheDocument();
    await userEvent.click(
      (await screen.findAllByRole('link', { name: 'Register vessel' }))[0]!,
    );
    await userEvent.type(
      screen.getByRole('textbox', { name: 'Vessel name' }),
      'Unfinished Manager draft',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(await screen.findByRole('button', { name: /Demo Auditor/i })).toBeEnabled();
    expect(
      screen.queryByDisplayValue('Unfinished Manager draft'),
    ).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Demo Auditor/i }));
    expect(await screen.findByText('Demo Auditor')).toBeInTheDocument();
    expect(screen.queryByText('Demo Manager')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: 'Register vessel' }),
    ).not.toBeInTheDocument();
    first.unmount();
    const beforeReload = fetch.mock.calls.length;
    renderWorkspace('/app/vessels/new');
    expect(
      await screen.findByRole('heading', { name: 'This role cannot register vessels.' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    const profileRequests = fetch.mock.calls
      .slice(beforeReload)
      .filter(([input]) => requestUrl(input).endsWith('/access/me'));
    expect(profileRequests.length).toBeGreaterThan(0);
    expect(
      profileRequests.every(
        ([, init]) =>
          new Headers(init?.headers).get('Authorization') ===
          'Bearer demo.synthetic-auditor',
      ),
    ).toBe(true);
    expect(
      fetch.mock.calls.filter(
        ([, init]) =>
          init?.method === 'POST' &&
          typeof init.body === 'string' &&
          init.body.includes('Unfinished'),
      ),
    ).toHaveLength(0);
  });

  it('retains form values after a write limit and saves with the same session on retry', async () => {
    const fetch = configureApi(true);
    renderWorkspace('/app/vessels/new');
    await userEvent.click(await screen.findByRole('button', { name: /Demo Manager/i }));
    const name = await screen.findByRole('textbox', { name: 'Vessel name' });
    const registry = screen.getByRole('textbox', { name: 'Registry number' });
    await userEvent.type(name, 'MV Retained Demo Draft');
    await userEvent.type(registry, 'KW-900013');
    await userEvent.click(screen.getByRole('button', { name: 'Register vessel' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Try again in 60 seconds. Reading remains available.',
    );
    expect(name).toHaveValue('MV Retained Demo Draft');
    expect(registry).toHaveValue('KW-900013');
    expect(screen.getByRole('region', { name: 'Notifications' })).toContainElement(
      screen.getByRole('alert'),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Register vessel' }));
    expect(
      await screen.findByRole('heading', { name: '1 vessel on watch' }),
    ).toBeInTheDocument();
    expect(await screen.findAllByText('MV Retained Demo Draft')).not.toHaveLength(0);
    expect(
      fetch.mock.calls.filter(([input]) =>
        requestUrl(input).endsWith('/access/demo/sessions'),
      ),
    ).toHaveLength(1);
    const writes = fetch.mock.calls.filter(
      ([, init]) =>
        init?.method === 'POST' &&
        typeof init.body === 'string' &&
        init.body.includes('KW-900013'),
    );
    expect(writes).toHaveLength(2);
    expect(
      writes.map(([, init]) => new Headers(init?.headers).get('Authorization')),
    ).toEqual(['Bearer demo.synthetic-manager', 'Bearer demo.synthetic-manager']);
  });

  it('restores Manager access on reload and removes the open form at fixed expiry', async () => {
    configureApi();
    vi.useFakeTimers({ toFake: ['Date'] });
    const first = renderWorkspace('/app/vessels/new');
    await userEvent.click(await screen.findByRole('button', { name: /Demo Manager/i }));
    expect(
      await screen.findByRole('textbox', { name: 'Vessel name' }),
    ).toBeInTheDocument();
    first.unmount();
    renderWorkspace('/app/vessels/new');
    expect(await screen.findByText('Demo Manager')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Vessel name' })).toBeInTheDocument();
    act(() => {
      vi.setSystemTime(Date.now() + 3_600_000);
      window.dispatchEvent(new Event('focus'));
    });
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Your demo session expired.',
    );
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /Demo Auditor/i })).toBeEnabled();
  });
});
