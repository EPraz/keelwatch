import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { Outlet, MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CurrentUser } from '../../access/current-user.types';
import { AuthSessionContext } from '../../auth/auth-context';
import { FleetPage } from './fleet-page';

const manager: CurrentUser = {
  id: '00000000-0000-4000-8000-000000000001',
  displayName: 'Morgan Reed',
  email: 'morgan.reed@example.test',
  roles: ['OPERATIONS_MANAGER'],
  permissions: ['fleet:read', 'fleet:write'],
};

const auditor: CurrentUser = {
  id: '00000000-0000-4000-8000-000000000002',
  displayName: 'Avery Chen',
  email: 'avery.chen@example.test',
  roles: ['AUDITOR'],
  permissions: ['fleet:read'],
};

function renderFleet(user: CurrentUser) {
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
      <MemoryRouter initialEntries={['/app/vessels']}>
        <Routes>
          <Route path="/app" element={<TestShell />}>
            <Route path="vessels" element={<FleetPage />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthSessionContext.Provider>,
  );
}

function pageResponse(items: readonly object[] = []): Response {
  return new Response(
    JSON.stringify({
      items,
      page: 1,
      pageSize: 20,
      total: items.length,
      totalPages: items.length ? 1 : 0,
    }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  );
}

afterEach(() => vi.unstubAllGlobals());

describe('FleetPage', () => {
  it('keeps the loaded list visible while the next page is pending', async () => {
    const vessel = {
      id: '10000000-0000-4000-8000-000000000001',
      name: 'MV Northwind',
      registryNumber: 'KW-000001',
      status: 'ACTIVE',
      createdAt: '2026-10-02T12:00:00.000Z',
    };
    let finish: ((response: Response) => void) | undefined;
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(
          Response.json({
            items: [vessel],
            page: 1,
            pageSize: 20,
            total: 21,
            totalPages: 2,
          }),
        )
        .mockImplementationOnce(
          () =>
            new Promise<Response>((resolve) => {
              finish = resolve;
            }),
        ),
    );
    renderFleet(auditor);
    await screen.findAllByText('MV Northwind');
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    await waitFor(() => expect(finish).toBeDefined());
    expect(screen.queryAllByText('MV Northwind')).not.toHaveLength(0);
    expect(screen.queryByLabelText('Loading vessels')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
    finish!(
      Response.json({
        items: [{ ...vessel, name: 'MV Southwind' }],
        page: 2,
        pageSize: 20,
        total: 21,
        totalPages: 2,
      }),
    );
    await screen.findAllByText('MV Southwind');
    expect(screen.queryAllByText('MV Northwind')).toHaveLength(0);
  });

  it('gives a manager an actionable and accessible empty state', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(pageResponse()));
    renderFleet(manager);

    expect(
      await screen.findByRole('heading', { name: 'No vessels are on watch yet.' }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Register vessel' })).not.toHaveLength(0);
    const accessibility = await axe.run(document.body, {
      rules: { 'color-contrast': { enabled: false } },
    });
    expect(accessibility.violations).toEqual([]);
  });

  it('lists vessels for an Auditor without offering a write action', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        pageResponse([
          {
            id: '10000000-0000-4000-8000-000000000001',
            name: 'MV Northwind',
            registryNumber: 'KW-000001',
            status: 'ACTIVE',
            createdAt: '2026-10-02T12:00:00.000Z',
          },
        ]),
      ),
    );
    renderFleet(auditor);

    expect(
      await screen.findByRole('heading', { name: '1 vessel on watch' }),
    ).toBeInTheDocument();
    expect(await screen.findAllByText('MV Northwind')).not.toHaveLength(0);
    expect(
      screen.queryByRole('link', { name: 'Register vessel' }),
    ).not.toBeInTheDocument();
    expect(screen.getByText('Read-only watch')).toBeInTheDocument();
  });

  it('keeps a persistent error in place and retries without losing the page', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('Network unavailable'))
      .mockResolvedValueOnce(pageResponse());
    vi.stubGlobal('fetch', fetchMock);
    renderFleet(manager);

    expect(
      await screen.findByRole('heading', { name: 'The Fleet register could not load.' }),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(
      await screen.findByRole('heading', { name: 'No vessels are on watch yet.' }),
    ).toBeInTheDocument();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });
});
