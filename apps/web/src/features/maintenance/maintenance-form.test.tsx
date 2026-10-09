import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import { AuthSessionContext } from '../../auth/auth-context';
import { MaintenanceForm } from './maintenance-form';
import type { MaintenanceOrder } from './maintenance.types';
import { useMaintenanceForm } from './use-maintenance-form';
import axe from 'axe-core';

const initial: MaintenanceOrder = {
  id: 'order',
  vesselId: 'vessel',
  title: 'Inspect pump',
  category: 'INSPECTION',
  priority: 'NORMAL',
  status: 'OPEN',
  revision: 1,
  assignee: null,
  targetDate: null,
  createdAt: '2026-10-09T12:00:00Z',
  updatedAt: '2026-10-09T12:00:00Z',
};
function show(onSaved = vi.fn()) {
  return render(
    <AuthSessionContext.Provider
      value={{
        status: 'authenticated',
        mode: 'local',
        getAccessToken: () => Promise.resolve('local.operations-manager'),
        signIn: () => Promise.resolve(),
        signOut: () => Promise.resolve(),
      }}
    >
      <MemoryRouter>
        <main>
          <MaintenanceForm vesselId="vessel" initial={initial} onSaved={onSaved} />
        </main>
      </MemoryRouter>
    </AuthSessionContext.Provider>,
  );
}
afterEach(() => vi.unstubAllGlobals());
it('aborts an old session write and ignores its late success', async () => {
  let resolveWrite!: (response: Response) => void;
  const fetchMock = vi.fn(
    () =>
      new Promise<Response>((resolve) => {
        resolveWrite = resolve;
      }),
  );
  vi.stubGlobal('fetch', fetchMock);
  let session = {
    status: 'authenticated' as const,
    mode: 'local' as const,
    getAccessToken: () => Promise.resolve('local.operations-manager'),
    signIn: () => Promise.resolve(),
    signOut: () => Promise.resolve(),
  };
  const saved = vi.fn();
  const { result, rerender } = renderHook(
    () => useMaintenanceForm('vessel', initial, saved),
    {
      wrapper: ({ children }) => (
        <AuthSessionContext.Provider value={session}>
          {children}
        </AuthSessionContext.Provider>
      ),
    },
  );
  let write!: Promise<void>;
  act(() => {
    write = result.current.save();
  });
  await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
  session = { ...session, getAccessToken: () => Promise.resolve('local.auditor') };
  rerender();
  expect(
    (fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].signal?.aborted,
  ).toBe(true);
  resolveWrite(Response.json({ ...initial, revision: 2 }));
  await act(() => write);
  expect(saved).not.toHaveBeenCalled();
  expect(result.current.pending).toBe(false);
});
it('keeps a selected responsible user visible when paging the selector', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) =>
      Promise.resolve(
        Response.json({
          items: url.endsWith('page=1')
            ? [{ id: 'selected', displayName: 'Synthetic Selected Owner' }]
            : [{ id: 'other', displayName: 'Synthetic Other Owner' }],
          page: url.endsWith('page=1') ? 1 : 2,
          totalPages: 2,
        }),
      ),
    ),
  );
  show();
  await userEvent.click(
    await screen.findByRole('radio', { name: 'Synthetic Selected Owner' }),
  );
  await userEvent.click(screen.getByRole('button', { name: 'Next users' }));
  await screen.findByRole('radio', { name: 'Synthetic Other Owner' });
  expect(
    screen.getByRole('radio', { name: 'Synthetic Selected Owner (retained assignment)' }),
  ).toBeChecked();
});
it('does not unlock another creation after a newer recovery read is forbidden', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string, options: RequestInit) => {
      if (url.includes('/assignees'))
        return Promise.resolve(Response.json({ items: [], totalPages: 0 }));
      if (options.method === 'POST')
        return Promise.reject(new TypeError('Synthetic timeout'));
      return Promise.resolve(
        url.endsWith('page=2')
          ? Response.json(
              { code: 'FORBIDDEN', message: 'Synthetic denied' },
              { status: 403 },
            )
          : Response.json({ items: [], page: 1, totalPages: 2 }),
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
      <MemoryRouter>
        <MaintenanceForm vesselId="vessel" onSaved={() => {}} />
      </MemoryRouter>
    </AuthSessionContext.Provider>,
  );
  await userEvent.type(screen.getByLabelText('Order title'), 'Inspect uncertain work');
  await userEvent.click(screen.getByRole('button', { name: 'Create maintenance order' }));
  await userEvent.click(
    await screen.findByRole('button', { name: 'Next existing orders' }),
  );
  await screen.findByText('Maintenance access denied.');
  expect(
    screen.queryByRole('button', {
      name: 'I checked existing orders; allow another attempt',
    }),
  ).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Create maintenance order' })).toBeDisabled();
});
it('retries a failed assignee read without submitting the surrounding form', async () => {
  let reads = 0;
  const fetchMock = vi.fn((_url: string, options: RequestInit) => {
    expect(options.method).not.toBe('PUT');
    reads += 1;
    return Promise.resolve(
      reads === 1
        ? Response.json({ message: 'Synthetic unavailable' }, { status: 503 })
        : Response.json({ items: [], totalPages: 0 }),
    );
  });
  vi.stubGlobal('fetch', fetchMock);
  show();
  await userEvent.click(
    await screen.findByRole('button', { name: 'Retry maintenance read' }),
  );
  await screen.findByText('No eligible users on this page.');
  expect(fetchMock).toHaveBeenCalledTimes(2);
  expect(
    (await axe.run(document.body, { rules: { 'color-contrast': { enabled: false } } }))
      .violations,
  ).toEqual([]);
});
it('retains a draft when conflict recovery fails and retries only the read', async () => {
  let writes = 0;
  let reads = 0;
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string, options: RequestInit) => {
      if (url.includes('/assignees'))
        return Promise.resolve(Response.json({ items: [], totalPages: 0 }));
      if (options.method === 'PUT') {
        writes += 1;
        return Promise.resolve(
          Response.json(
            { code: 'MAINTENANCE_STALE_WRITE', message: 'Changed' },
            { status: 409 },
          ),
        );
      }
      reads += 1;
      return Promise.resolve(
        reads === 1
          ? Response.json({ message: 'Synthetic unavailable' }, { status: 503 })
          : Response.json({ ...initial, revision: 2, status: 'CLOSED' }),
      );
    }),
  );
  show();
  await userEvent.clear(screen.getByLabelText('Order title'));
  await userEvent.type(screen.getByLabelText('Order title'), 'Retained choice');
  await userEvent.click(screen.getByRole('button', { name: 'Save maintenance changes' }));
  await userEvent.click(
    await screen.findByRole('button', { name: 'Retry maintenance read' }),
  );
  await screen.findByRole('heading', { name: 'Review current order' });
  expect(screen.getByLabelText('Order title')).toHaveValue('Retained choice');
  expect(screen.getByRole('button', { name: 'Save maintenance changes' })).toBeDisabled();
  expect(
    screen.queryByRole('button', { name: 'Continue with reviewed values' }),
  ).not.toBeInTheDocument();
  expect(writes).toBe(1);
  expect(reads).toBe(2);
});
it('retains the draft, reviews changed values and deliberately saves after repeated conflicts', async () => {
  const writes: { expectedRevision: number; title: string; priority: string }[] = [];
  const fetchMock = vi.fn((url: string, options: RequestInit) => {
    if (url.includes('/assignees'))
      return Promise.resolve(Response.json({ items: [], totalPages: 0 }));
    if (options.method === 'PUT') {
      writes.push(JSON.parse(options.body as string) as (typeof writes)[number]);
      if (writes.length <= 2)
        return Promise.resolve(
          Response.json(
            { code: 'MAINTENANCE_STALE_WRITE', message: 'This order changed.' },
            { status: 409 },
          ),
        );
      return Promise.resolve(
        Response.json({ ...initial, ...writes.at(-1), revision: 4 }),
      );
    }
    return Promise.resolve(
      Response.json({
        ...initial,
        title: writes.length === 1 ? 'Inspect coupling' : 'Inspect impeller',
        revision: writes.length + 1,
      }),
    );
  });
  vi.stubGlobal('fetch', fetchMock);
  const saved = vi.fn();
  show(saved);
  await userEvent.clear(screen.getByLabelText('Order title'));
  await userEvent.type(screen.getByLabelText('Order title'), 'My retained draft');
  await userEvent.selectOptions(screen.getByLabelText('Priority'), 'HIGH');
  await userEvent.click(screen.getByRole('button', { name: 'Save maintenance changes' }));
  await screen.findByRole('heading', { name: 'Review current order' });
  expect(screen.getByLabelText('Order title')).toHaveValue('My retained draft');
  expect(writes).toHaveLength(1);
  await userEvent.click(screen.getByRole('button', { name: 'Use current Order title' }));
  await userEvent.click(
    screen.getByRole('button', { name: 'Continue with reviewed values' }),
  );
  await userEvent.click(screen.getByRole('button', { name: 'Save maintenance changes' }));
  await screen.findByText('Current: Inspect impeller');
  expect(screen.getByLabelText('Priority')).toHaveValue('HIGH');
  await userEvent.click(
    screen.getByRole('button', { name: 'Continue with reviewed values' }),
  );
  await userEvent.click(screen.getByRole('button', { name: 'Save maintenance changes' }));
  await waitFor(() => expect(saved).toHaveBeenCalledOnce());
  expect(writes).toEqual([
    expect.objectContaining({
      expectedRevision: 1,
      title: 'My retained draft',
      priority: 'HIGH',
    }),
    expect.objectContaining({
      expectedRevision: 2,
      title: 'Inspect coupling',
      priority: 'HIGH',
    }),
    expect.objectContaining({
      expectedRevision: 3,
      title: 'Inspect coupling',
      priority: 'HIGH',
    }),
  ]);
});
it('checks existing orders after an unconfirmed creation before allowing another explicit attempt', async () => {
  const fetchMock = vi.fn((url: string, options: RequestInit) => {
    if (options.method === 'POST')
      return Promise.reject(new TypeError('Synthetic timeout'));
    if (url.includes('/assignees'))
      return Promise.resolve(Response.json({ items: [], totalPages: 0 }));
    return Promise.resolve(
      Response.json({
        items: [{ ...initial, title: 'Possibly saved order' }],
        page: 1,
        totalPages: 1,
        total: 1,
        pageSize: 20,
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
      <MemoryRouter>
        <main>
          <MaintenanceForm vesselId="vessel" onSaved={() => {}} />
        </main>
      </MemoryRouter>
    </AuthSessionContext.Provider>,
  );
  await userEvent.type(screen.getByLabelText('Order title'), 'Possibly saved order');
  await userEvent.click(screen.getByRole('button', { name: 'Create maintenance order' }));
  await screen.findByRole('link', { name: 'Possibly saved order' });
  expect(screen.getByRole('button', { name: 'Create maintenance order' })).toBeDisabled();
  expect(
    fetchMock.mock.calls.filter(([, options]) => options.method === 'POST'),
  ).toHaveLength(1);
  await userEvent.click(
    screen.getByRole('button', {
      name: 'I checked existing orders; allow another attempt',
    }),
  );
  expect(screen.getByRole('button', { name: 'Create maintenance order' })).toBeEnabled();
  expect(screen.getByLabelText('Order title')).toHaveValue('Possibly saved order');
});
