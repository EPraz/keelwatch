import { render, screen } from '@testing-library/react';
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import { AuthSessionContext } from '../../auth/auth-context';
import { MaintenanceDetailPage } from './maintenance-detail-page';

afterEach(() => vi.unstubAllGlobals());
it('lets an Auditor inspect a directly linked order without editing controls', async () => {
  const fetchMock = vi.fn().mockResolvedValue(
    Response.json({
      id: 'order',
      vesselId: 'vessel',
      title: 'Inspect pump',
      status: 'OPEN',
      category: 'INSPECTION',
      priority: 'HIGH',
      revision: 1,
      assignee: { id: 'manager', displayName: 'Synthetic Manager' },
      targetDate: '2026-10-30',
    }),
  );
  vi.stubGlobal('fetch', fetchMock);
  render(
    <AuthSessionContext.Provider
      value={{
        status: 'authenticated',
        mode: 'local',
        getAccessToken: () => Promise.resolve('local.auditor'),
        signIn: () => Promise.resolve(),
        signOut: () => Promise.resolve(),
      }}
    >
      <MemoryRouter initialEntries={['/app/vessels/vessel/maintenance/order']}>
        <Routes>
          <Route
            element={
              <Outlet
                context={{
                  user: {
                    id: 'auditor',
                    permissions: ['maintenance:read', 'fleet:read'],
                  },
                }}
              />
            }
          >
            <Route
              path="/app/vessels/:vesselId/maintenance/:orderId"
              element={<MaintenanceDetailPage />}
            />
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthSessionContext.Provider>,
  );
  expect(
    await screen.findByRole('heading', { name: 'Inspect pump' }),
  ).toBeInTheDocument();
  expect(screen.getByText('Synthetic Manager')).toBeInTheDocument();
  expect(
    screen.queryByRole('button', { name: 'Save maintenance changes' }),
  ).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Vessel workspace' })).toHaveAttribute(
    'href',
    '/app/vessels/vessel',
  );
  expect(fetchMock).toHaveBeenCalledOnce();
});
