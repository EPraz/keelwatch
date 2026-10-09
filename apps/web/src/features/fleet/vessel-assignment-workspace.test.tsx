import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import { AuthSessionContext } from '../../auth/auth-context';
import { VesselDetailPage } from './vessel-detail-page';

afterEach(() => vi.unstubAllGlobals());
it.each([401, 403, 404, 503])(
  'retains confirmed write feedback when refreshing Activity fails with %s',
  async (status) => {
    let saved = false;
    const member = {
      id: 'profile',
      displayName: 'Jordan Vale',
      crewNumber: 'KW-C-000001',
    };
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string, options: RequestInit) => {
        if (options.method === 'POST') {
          saved = true;
          return Promise.resolve(Response.json({ id: 'plan' }, { status: 201 }));
        }
        if (url.includes('crew-composition'))
          return Promise.resolve(
            Response.json({
              vessel: { id: 'vessel', status: 'ACTIVE' },
              date: '2026-10-08',
              role: null,
              consultedAt: '2026-10-08T00:00:00Z',
              items: [],
              total: 0,
              totalPages: 0,
              page: 1,
              pageSize: 20,
            }),
          );
        if (url.includes('crew-assignments'))
          return Promise.resolve(
            Response.json({
              vessel: { status: 'ACTIVE' },
              items: [],
              asOf: '2026-10-08',
              total: 0,
              totalPages: 0,
            }),
          );
        if (url.includes('crew-members'))
          return Promise.resolve(Response.json({ items: [member], totalPages: 1 }));
        if (url.endsWith('/compliance'))
          return Promise.resolve(
            Response.json({
              certificates: [],
              certificateTypes: [],
              requirements: [],
              asOf: '2026-10-08',
              status: 'VALID',
              reason: 'Demo',
            }),
          );
        if (saved)
          return Promise.resolve(
            Response.json(
              {
                code: 'TEMPORARY_FAILURE',
                message: 'Activity unavailable.',
                correlationId: 'demo-activity',
              },
              { status },
            ),
          );
        return Promise.resolve(
          Response.json({
            id: 'vessel',
            name: 'MV Demo',
            registryNumber: 'KW-000001',
            status: 'ACTIVE',
            createdAt: '2026-10-08',
            updatedAt: '2026-10-08',
            activity: [],
          }),
        );
      }),
    );
    function Shell() {
      return (
        <Outlet
          context={{ user: { permissions: ['fleet:read', 'crew:read', 'crew:write'] } }}
        />
      );
    }
    render(
      <AuthSessionContext.Provider
        value={{
          status: 'authenticated',
          mode: 'local',
          getAccessToken: () => Promise.resolve('local.operations-manager'),
          signIn: () => Promise.resolve(),
          signOut: () => Promise.resolve(),
        }}
      >
        <MemoryRouter initialEntries={['/app/vessels/vessel']}>
          <Routes>
            <Route path="/app" element={<Shell />}>
              <Route path="vessels/:vesselId" element={<VesselDetailPage />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </AuthSessionContext.Provider>,
    );
    await userEvent.click(await screen.findByRole('radio', { name: /Jordan Vale/u }));
    await userEvent.type(screen.getByLabelText('Starts on'), '2040-01-01');
    await userEvent.type(screen.getByLabelText('Ends on'), '2040-01-02');
    await userEvent.click(screen.getByRole('button', { name: 'Create plan' }));
    if (status === 404) await screen.findByRole('heading', { name: 'Vessel not found.' });
    else await screen.findByText(/Activity unavailable/u);
    expect(screen.getByText(/Plan saved/u)).toBeInTheDocument();
    if (status === 503) {
      expect(screen.getByRole('heading', { name: 'MV Demo' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Retry Activity' })).toBeInTheDocument();
    } else {
      expect(screen.queryByRole('heading', { name: 'MV Demo' })).not.toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: 'Create plan' }),
      ).not.toBeInTheDocument();
    }
  },
);
