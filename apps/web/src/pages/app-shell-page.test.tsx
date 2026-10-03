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
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify(currentUser), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      ),
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
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    const accessibility = await axe.run(document.body, {
      rules: { 'color-contrast': { enabled: false } },
    });
    expect(accessibility.violations).toEqual([]);
  });
});
