import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import axe from 'axe-core';
import type { CurrentUser } from '../access/current-user.types';
import { AuthSessionContext } from '../auth/auth-context';
import { AppShellPage } from './app-shell-page';
import { OverviewPage } from './overview-page';

const currentUser: CurrentUser = {
  id: 'usr_demo_operations_manager',
  email: 'morgan.reed@example.test',
  displayName: 'Morgan Reed',
  roles: ['OPERATIONS_MANAGER'],
  permissions: ['fleet:read', 'fleet:write'],
};

afterEach(() => vi.unstubAllGlobals());

describe('AppShellPage', () => {
  it('renders the identity and permissions returned by the API', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((input: RequestInfo | URL) => {
        const url =
          typeof input === 'string'
            ? input
            : input instanceof URL
              ? input.href
              : input.url;
        const body = url.includes('/access/me')
          ? currentUser
          : {
              asOf: '2026-10-04',
              items: [],
              counts: { MISSING: 0, EXPIRED: 0, EXPIRING_SOON: 0, VALID: 0 },
              totalVessels: 0,
              page: 1,
              pageSize: 3,
              total: 0,
              totalPages: 0,
            };
        return Promise.resolve(
          new Response(JSON.stringify(body), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }),
        );
      }),
    );

    render(
      <AuthSessionContext.Provider
        value={{
          status: 'authenticated',
          mode: 'local',
          signIn: () => Promise.resolve(),
          signOut: () => Promise.resolve(),
          getAccessToken: () => Promise.resolve('local.operations-manager'),
        }}
      >
        <MemoryRouter initialEntries={['/app']}>
          <Routes>
            <Route path="/app" element={<AppShellPage />}>
              <Route index element={<OverviewPage />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </AuthSessionContext.Provider>,
    );

    expect(
      await screen.findByRole('heading', { name: 'Identity register' }),
    ).toBeInTheDocument();
    expect(screen.getAllByText('Morgan Reed').length).toBeGreaterThan(0);
    expect(screen.getByText('fleet / write')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Compliance/u })).toHaveAttribute(
      'href',
      '/app/compliance',
    );
    expect(
      await screen.findByRole('heading', { name: 'Documentary watch is clear.' }),
    ).toBeInTheDocument();
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
    const accessibility = await axe.run(document.body, {
      rules: { 'color-contrast': { enabled: false } },
    });
    expect(accessibility.violations).toEqual([]);
  });
});
