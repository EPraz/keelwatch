import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import { AuthSessionContext } from '../../auth/auth-context';
import { MaintenanceLifecycle } from './maintenance-lifecycle';
import type { MaintenanceOrder } from './maintenance.types';
import axe from 'axe-core';

const initial: MaintenanceOrder = {
  id: 'order',
  vesselId: 'vessel',
  title: 'Inspect pump',
  category: 'INSPECTION',
  priority: 'NORMAL',
  status: 'IN_PROGRESS',
  reasonCode: null,
  revision: 1,
  assignee: { id: 'manager', displayName: 'Synthetic Manager' },
  targetDate: '2026-11-01',
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
          <MaintenanceLifecycle vesselId="vessel" initial={initial} onSaved={onSaved} />
        </main>
      </MemoryRouter>
    </AuthSessionContext.Provider>,
  );
}
afterEach(() => vi.unstubAllGlobals());
it('reviews a refreshed revision before submitting an action allowed only in the new state', async () => {
  const session = {
    status: 'authenticated' as const,
    mode: 'local' as const,
    getAccessToken: () => Promise.resolve('local.operations-manager'),
    signIn: () => Promise.resolve(),
    signOut: () => Promise.resolve(),
  };
  const saved = vi.fn();
  const renderOrder = (order: MaintenanceOrder) => (
    <AuthSessionContext.Provider value={session}>
      <MemoryRouter>
        <main>
          <MaintenanceLifecycle vesselId="vessel" initial={order} onSaved={saved} />
        </main>
      </MemoryRouter>
    </AuthSessionContext.Provider>
  );
  const fetchMock = vi.fn().mockResolvedValue(Response.json({ ...initial, revision: 3 }));
  vi.stubGlobal('fetch', fetchMock);
  const view = render(renderOrder({ ...initial, status: 'OPEN' }));
  view.rerender(renderOrder({ ...initial, status: 'PLANNED', revision: 2 }));
  await userEvent.selectOptions(screen.getByLabelText('Lifecycle action'), 'START');
  await userEvent.click(screen.getByRole('button', { name: 'Start work' }));
  await screen.findByRole('heading', { name: 'Review current state' });
  expect(fetchMock).not.toHaveBeenCalled();
  await userEvent.click(
    screen.getByRole('button', { name: 'Continue with reviewed state' }),
  );
  await userEvent.click(screen.getByRole('button', { name: 'Start work' }));
  await waitFor(() => expect(saved).toHaveBeenCalledOnce());
  expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
    body: JSON.stringify({ action: 'START', expectedRevision: 2 }),
  });
});
it('validates the reason beside its field and focuses the error without writing', async () => {
  const fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  show();
  await userEvent.selectOptions(screen.getByLabelText('Lifecycle action'), 'BLOCK');
  await userEvent.click(screen.getByRole('button', { name: 'Block work' }));
  expect(screen.getByLabelText('Block reason')).toHaveAttribute('aria-invalid', 'true');
  expect(screen.getByRole('alert')).toHaveFocus();
  expect(fetchMock).not.toHaveBeenCalled();
  expect(
    (await axe.run(document.body, { rules: { 'color-contrast': { enabled: false } } }))
      .violations,
  ).toEqual([]);
});
it('retries only the current-state read after an unconfirmed action and locks a final latest state', async () => {
  let writes = 0;
  let reads = 0;
  vi.stubGlobal(
    'fetch',
    vi.fn((_url: string, options: RequestInit) => {
      if (options.method === 'POST') {
        writes += 1;
        return Promise.reject(new TypeError('Synthetic timeout'));
      }
      reads += 1;
      return Promise.resolve(
        reads === 1
          ? Response.json({ message: 'Synthetic unavailable' }, { status: 503 })
          : Response.json({
              ...initial,
              status: 'CANCELLED',
              reasonCode: 'WORK_NO_LONGER_REQUIRED',
              revision: 2,
            }),
      );
    }),
  );
  show();
  await userEvent.selectOptions(screen.getByLabelText('Lifecycle action'), 'CANCEL');
  await userEvent.selectOptions(
    screen.getByLabelText('Cancellation reason'),
    'WORK_NO_LONGER_REQUIRED',
  );
  await userEvent.click(screen.getByRole('button', { name: 'Cancel order' }));
  await userEvent.click(
    await screen.findByRole('button', { name: 'Retry maintenance read' }),
  );
  await screen.findByText(
    'This order is final. No further action is permitted; your intent remains visible.',
  );
  expect(
    screen.getByText('Retained reason: Work no longer required'),
  ).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Cancel order' })).not.toBeInTheDocument();
  expect(
    screen.queryByRole('button', { name: 'Continue with reviewed state' }),
  ).not.toBeInTheDocument();
  expect(writes).toBe(1);
  expect(reads).toBe(2);
});
it('prevents a second pending submission and aborts the request on unmount', async () => {
  let finish!: (response: Response) => void;
  const fetchMock = vi.fn((url: string, options: RequestInit) => {
    expect(url).toContain('/transitions');
    expect(options.method).toBe('POST');
    return new Promise<Response>((resolve) => {
      finish = resolve;
    });
  });
  vi.stubGlobal('fetch', fetchMock);
  const saved = vi.fn();
  const view = show(saved);
  await userEvent.selectOptions(screen.getByLabelText('Lifecycle action'), 'CLOSE');
  await userEvent.click(screen.getByRole('button', { name: 'Close order' }));
  expect(screen.getByRole('button', { name: 'Saving lifecycle action…' })).toBeDisabled();
  await userEvent.click(screen.getByRole('button', { name: 'Saving lifecycle action…' }));
  expect(fetchMock).toHaveBeenCalledOnce();
  view.unmount();
  expect(fetchMock.mock.calls[0]?.[1].signal?.aborted).toBe(true);
  finish(Response.json({ ...initial, status: 'CLOSED', revision: 2 }));
  await waitFor(() => expect(saved).not.toHaveBeenCalled());
});
it('retains intent and reason through repeat conflicts and removes an action invalidated by the latest state', async () => {
  const writes: { action: string; expectedRevision: number; reasonCode?: string }[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn((_url: string, options: RequestInit) => {
      if (options.method === 'POST') {
        writes.push(JSON.parse(options.body as string) as (typeof writes)[number]);
        return Promise.resolve(
          writes.length <= 2
            ? Response.json(
                { code: 'MAINTENANCE_STALE_WRITE', message: 'Changed order' },
                { status: 409 },
              )
            : Response.json({ ...initial, revision: 4 }),
        );
      }
      return Promise.resolve(
        Response.json({
          ...initial,
          title: 'New recorded title',
          revision: writes.length + 1,
          status: writes.length === 1 ? 'IN_PROGRESS' : 'BLOCKED',
          reasonCode: writes.length === 1 ? null : 'COORDINATION_REQUIRED',
        }),
      );
    }),
  );
  const saved = vi.fn();
  show(saved);
  await userEvent.selectOptions(screen.getByLabelText('Lifecycle action'), 'BLOCK');
  await userEvent.selectOptions(
    screen.getByLabelText('Block reason'),
    'AWAITING_RESOURCES',
  );
  await userEvent.click(screen.getByRole('button', { name: 'Block work' }));
  await screen.findByRole('heading', { name: 'Review current state' });
  expect(screen.getByText('Current: New recorded title')).toBeInTheDocument();
  expect(screen.getByLabelText('Block reason')).toHaveValue('AWAITING_RESOURCES');
  expect(writes).toHaveLength(1);
  await userEvent.click(
    screen.getByRole('button', { name: 'Continue with reviewed state' }),
  );
  await userEvent.click(screen.getByRole('button', { name: 'Block work' }));
  await screen.findByText('Block work is no longer available in the current state.');
  expect(screen.queryByRole('button', { name: 'Block work' })).not.toBeInTheDocument();
  expect(screen.getByText('Retained reason: Awaiting resources')).toBeInTheDocument();
  await userEvent.click(
    screen.getByRole('button', { name: 'Continue with reviewed state' }),
  );
  await userEvent.selectOptions(screen.getByLabelText('Lifecycle action'), 'RESUME');
  await userEvent.click(screen.getByRole('button', { name: 'Resume work' }));
  await waitFor(() => expect(saved).toHaveBeenCalledOnce());
  expect(writes).toEqual([
    { action: 'BLOCK', reasonCode: 'AWAITING_RESOURCES', expectedRevision: 1 },
    { action: 'BLOCK', reasonCode: 'AWAITING_RESOURCES', expectedRevision: 2 },
    { action: 'RESUME', expectedRevision: 3 },
  ]);
});
