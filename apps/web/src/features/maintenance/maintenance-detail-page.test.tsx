import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import { AuthSessionContext } from '../../auth/auth-context';
import { MaintenanceDetailPage } from './maintenance-detail-page';

afterEach(() => vi.unstubAllGlobals());
it('refreshes history after a confirmed edit and retries history alone if that read fails', async () => {
  let writes = 0;
  let historyReads = 0;
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string, options: RequestInit) => {
      if (url.includes('/history')) {
        historyReads++;
        return Promise.resolve(
          historyReads === 2
            ? Response.json(
                { message: 'Confirmed history refresh failed' },
                { status: 503 },
              )
            : Response.json({
                items: [
                  {
                    id: `event-${historyReads}`,
                    action: 'MAINTENANCE_ORDER_UPDATED',
                    actorDisplayName: 'Synthetic Manager',
                    occurredAt: '2026-10-09T12:00:00.000Z',
                    reasonCode: null,
                    changes: [
                      {
                        field: 'title',
                        oldValue: 'Original history title',
                        newValue: writes
                          ? 'Confirmed new history title'
                          : 'Initial history title',
                      },
                    ],
                  },
                ],
                pageSize: 20,
                nextCursor: null,
              }),
        );
      }
      if (url.includes('/assignees'))
        return Promise.resolve(Response.json({ items: [], totalPages: 0 }));
      if (options.method === 'PUT') writes++;
      return Promise.resolve(
        Response.json({
          id: 'order',
          vesselId: 'vessel',
          title: writes ? 'Saved order title' : 'Inspect pump',
          category: 'INSPECTION',
          priority: 'NORMAL',
          status: 'OPEN',
          reasonCode: null,
          revision: writes ? 2 : 1,
          assignee: null,
          targetDate: null,
        }),
      );
    }),
  );
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
      <MemoryRouter initialEntries={['/app/vessels/vessel/maintenance/order']}>
        <Routes>
          <Route
            element={
              <Outlet
                context={{
                  user: {
                    id: 'manager',
                    permissions: [
                      'maintenance:read',
                      'maintenance:write',
                      'fleet:read',
                      'activity:read',
                    ],
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
  await screen.findByText('Initial history title');
  await userEvent.clear(screen.getByLabelText('Order title'));
  await userEvent.type(screen.getByLabelText('Order title'), 'Saved order title');
  await userEvent.click(screen.getByRole('button', { name: 'Save maintenance changes' }));
  await screen.findByText('Confirmed history refresh failed');
  expect(
    screen.getByText('Maintenance changes saved. The write is confirmed.'),
  ).toBeInTheDocument();
  await userEvent.click(
    within(screen.getByRole('alert')).getByRole('button', {
      name: 'Dismiss notification',
    }),
  );
  await userEvent.click(screen.getByRole('button', { name: 'Retry history read' }));
  await screen.findByText('Confirmed new history title');
  expect(writes).toBe(1);
  expect(historyReads).toBe(3);
});
it('keeps an unsaved field draft visible but immutable after a confirmed final transition', async () => {
  let closed = false;
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string, options: RequestInit) => {
      if (url.includes('/assignees'))
        return Promise.resolve(Response.json({ items: [], totalPages: 0 }));
      if (options.method === 'POST') closed = true;
      return Promise.resolve(
        Response.json({
          id: 'order',
          vesselId: 'vessel',
          title: 'Inspect pump',
          category: 'INSPECTION',
          priority: 'NORMAL',
          status: closed ? 'CLOSED' : 'IN_PROGRESS',
          reasonCode: null,
          revision: closed ? 2 : 1,
          assignee: null,
          targetDate: null,
        }),
      );
    }),
  );
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
      <MemoryRouter initialEntries={['/app/vessels/vessel/maintenance/order']}>
        <Routes>
          <Route
            element={
              <Outlet
                context={{
                  user: {
                    id: 'manager',
                    permissions: ['maintenance:read', 'maintenance:write', 'fleet:read'],
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
  await screen.findByLabelText('Order title');
  await userEvent.clear(screen.getByLabelText('Order title'));
  await userEvent.type(screen.getByLabelText('Order title'), 'Unsubmitted final draft');
  await userEvent.selectOptions(screen.getByLabelText('Lifecycle action'), 'CLOSE');
  await userEvent.click(screen.getByRole('button', { name: 'Close order' }));
  await screen.findByText('Closed · revision 2');
  expect(screen.getByLabelText('Order title')).toHaveValue('Unsubmitted final draft');
  expect(screen.getByLabelText('Order title')).toBeDisabled();
  expect(
    screen.queryByRole('button', { name: 'Save maintenance changes' }),
  ).not.toBeInTheDocument();
  expect(screen.queryByLabelText('Lifecycle action')).not.toBeInTheDocument();
  expect(
    screen.getByText('This order is final; retained draft values cannot be saved.'),
  ).toBeInTheDocument();
});
it('retains lifecycle intent and reason when field changes refresh the full detail', async () => {
  let revision = 1;
  let title = 'Inspect pump';
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string, options: RequestInit) => {
      if (url.includes('/assignees'))
        return Promise.resolve(Response.json({ items: [], totalPages: 0 }));
      if (options.method === 'PUT') {
        title = (JSON.parse(options.body as string) as { title: string }).title;
        revision = 2;
      }
      return Promise.resolve(
        Response.json({
          id: 'order',
          vesselId: 'vessel',
          title,
          category: 'INSPECTION',
          priority: 'NORMAL',
          status: 'IN_PROGRESS',
          reasonCode: null,
          revision,
          assignee: null,
          targetDate: null,
        }),
      );
    }),
  );
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
      <MemoryRouter initialEntries={['/app/vessels/vessel/maintenance/order']}>
        <Routes>
          <Route
            element={
              <Outlet
                context={{
                  user: {
                    id: 'manager',
                    permissions: ['maintenance:read', 'maintenance:write', 'fleet:read'],
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
  await screen.findByLabelText('Lifecycle action');
  await userEvent.selectOptions(screen.getByLabelText('Lifecycle action'), 'BLOCK');
  await userEvent.selectOptions(
    screen.getByLabelText('Block reason'),
    'AWAITING_RESOURCES',
  );
  await userEvent.clear(screen.getByLabelText('Order title'));
  await userEvent.type(screen.getByLabelText('Order title'), 'Saved field change');
  await userEvent.click(screen.getByRole('button', { name: 'Save maintenance changes' }));
  await screen.findByText('In progress · revision 2');
  expect(screen.getByLabelText('Lifecycle action')).toHaveValue('BLOCK');
  expect(screen.getByLabelText('Block reason')).toHaveValue('AWAITING_RESOURCES');
});
it('retains a confirmed lifecycle action when refresh fails and retries only the read', async () => {
  let writes = 0;
  let reads = 0;
  const fetchMock = vi.fn((url: string, options: RequestInit) => {
    if (url.includes('/assignees'))
      return Promise.resolve(Response.json({ items: [], totalPages: 0 }));
    if (options.method === 'POST') {
      writes += 1;
      return Promise.resolve(
        Response.json({ id: 'order', status: 'PLANNED', revision: 2 }),
      );
    }
    reads += 1;
    return Promise.resolve(
      reads === 2
        ? Response.json({ message: 'Synthetic refresh failure' }, { status: 503 })
        : Response.json({
            id: 'order',
            vesselId: 'vessel',
            title: 'Inspect pump',
            category: 'INSPECTION',
            priority: 'NORMAL',
            status: writes ? 'PLANNED' : 'OPEN',
            reasonCode: null,
            revision: writes ? 2 : 1,
            assignee: { id: 'manager', displayName: 'Synthetic Manager' },
            targetDate: '2026-11-01',
            vesselName: 'Synthetic Vessel',
          }),
    );
  });
  vi.stubGlobal('fetch', fetchMock);
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
      <MemoryRouter initialEntries={['/app/vessels/vessel/maintenance/order']}>
        <Routes>
          <Route
            element={
              <Outlet
                context={{
                  user: {
                    id: 'manager',
                    permissions: ['maintenance:read', 'maintenance:write', 'fleet:read'],
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
  await screen.findByRole('button', { name: 'Plan order' });
  await userEvent.clear(screen.getByLabelText('Order title'));
  await userEvent.type(screen.getByLabelText('Order title'), 'Retained unsaved draft');
  await userEvent.click(screen.getByRole('button', { name: 'Plan order' }));
  await screen.findByText('Synthetic refresh failure');
  expect(
    screen.getByText('Maintenance action saved. Current state: Planned.'),
  ).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Retry maintenance read' }));
  await screen.findByText('Planned · revision 2');
  expect(screen.getByLabelText('Order title')).toHaveValue('Retained unsaved draft');
  expect(writes).toBe(1);
  expect(
    screen.getByText('Maintenance action saved. Current state: Planned.'),
  ).toBeInTheDocument();
});
it('lets an Auditor inspect a directly linked order without editing controls', async () => {
  const fetchMock = vi.fn().mockResolvedValue(
    Response.json({
      id: 'order',
      vesselId: 'vessel',
      vesselName: 'Synthetic Test Vessel',
      vesselRegistryNumber: 'KW-TEST-001',
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
  expect(screen.getByText('Synthetic Test Vessel · KW-TEST-001')).toBeInTheDocument();
  expect(
    screen.queryByRole('button', { name: 'Save maintenance changes' }),
  ).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Vessel workspace' })).toHaveAttribute(
    'href',
    '/app/vessels/vessel',
  );
  expect(fetchMock).toHaveBeenCalledOnce();
});
