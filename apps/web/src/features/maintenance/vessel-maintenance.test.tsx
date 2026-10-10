import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import { AuthSessionContext } from '../../auth/auth-context';
import { VesselMaintenance } from './vessel-maintenance';

const session = {
  status: 'authenticated' as const,
  mode: 'local' as const,
  getAccessToken: () => Promise.resolve('local.operations-manager'),
  signIn: () => Promise.resolve(),
  signOut: () => Promise.resolve(),
};
function LocationProbe() {
  return <output aria-label="Workspace URL">{useLocation().search}</output>;
}
afterEach(() => vi.unstubAllGlobals());
it('keeps maintenance filters in the URL, resets its page and preserves other workspace parameters', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) =>
      Promise.resolve(
        Response.json({
          items: [],
          total: 0,
          totalPages: 0,
          pageSize: 20,
          page: Number(new URL(url, 'http://localhost').searchParams.get('page')),
        }),
      ),
    ),
  );
  render(
    <AuthSessionContext.Provider value={session}>
      <MemoryRouter
        initialEntries={['/app/vessels/vessel?maintenancePage=2&assignmentPage=3']}
      >
        <main>
          <VesselMaintenance
            vesselId="vessel"
            vesselStatus="ACTIVE"
            canWrite={false}
            onSaved={() => {}}
          />
          <LocationProbe />
        </main>
      </MemoryRouter>
    </AuthSessionContext.Provider>,
  );
  await screen.findByText('No orders on this page. Return to page one.');
  await userEvent.selectOptions(screen.getByLabelText('Maintenance priority'), 'HIGH');
  await userEvent.click(
    screen.getByRole('button', { name: 'Apply maintenance filters' }),
  );
  await screen.findByText('No maintenance orders match these filters.');
  expect(screen.getByLabelText('Workspace URL')).toHaveTextContent(
    'maintenancePriority=HIGH',
  );
  expect(screen.getByLabelText('Workspace URL')).toHaveTextContent('assignmentPage=3');
  expect(screen.getByLabelText('Workspace URL')).not.toHaveTextContent(
    'maintenancePage=2',
  );
  expect(screen.queryByRole('button', { name: 'Refresh maintenance orders' })).toBeNull();
  await userEvent.click(screen.getByRole('button', { name: 'Reset filters' }));
  await screen.findByText('No maintenance orders yet.');
  expect(screen.getByLabelText('Maintenance priority')).toHaveValue('');
  expect(screen.getByLabelText('Workspace URL')).toHaveTextContent('assignmentPage=3');
  expect(screen.getByLabelText('Workspace URL')).not.toHaveTextContent(
    'maintenancePriority',
  );
  expect(
    screen.getByRole('button', { name: 'Refresh maintenance orders' }),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole('button', { name: 'New maintenance order' }),
  ).not.toBeInTheDocument();
});
it('creates an order and retains its confirmation when the following list read fails', async () => {
  let saved = false;
  const fetchMock = vi.fn((url: string, options: RequestInit) => {
    if (options.method === 'POST') {
      saved = true;
      return Promise.resolve(
        Response.json(
          {
            id: 'order',
            vesselId: 'vessel',
            title: 'Inspect pump',
            category: 'INSPECTION',
            priority: 'NORMAL',
            status: 'OPEN',
            revision: 1,
            assignee: null,
            targetDate: null,
          },
          { status: 201 },
        ),
      );
    }
    if (url.includes('/assignees'))
      return Promise.resolve(Response.json({ items: [], totalPages: 0 }));
    return Promise.resolve(
      saved
        ? Response.json({ message: 'Read interrupted.' }, { status: 503 })
        : Response.json({ items: [], total: 0, totalPages: 0, pageSize: 20, page: 1 }),
    );
  });
  vi.stubGlobal('fetch', fetchMock);
  render(
    <AuthSessionContext.Provider value={session}>
      <MemoryRouter>
        <main>
          <VesselMaintenance
            vesselId="vessel"
            vesselStatus="ACTIVE"
            canWrite
            onSaved={() => {}}
          />
        </main>
      </MemoryRouter>
    </AuthSessionContext.Provider>,
  );
  await userEvent.click(
    await screen.findByRole('button', { name: 'New maintenance order' }),
  );
  await userEvent.type(screen.getByLabelText('Order title'), 'Inspect pump');
  await userEvent.selectOptions(screen.getByLabelText('Category'), 'INSPECTION');
  await userEvent.click(screen.getByRole('button', { name: 'Create maintenance order' }));
  await screen.findByText(/Maintenance order saved/u);
  await screen.findByText(/Read interrupted/u);
  await userEvent.click(screen.getByRole('button', { name: 'Retry maintenance read' }));
  expect(screen.getByText(/Maintenance order saved/u)).toBeInTheDocument();
  expect(
    fetchMock.mock.calls.filter(([, options]) => options.method === 'POST'),
  ).toHaveLength(1);
});
