import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import { AuthSessionContext } from '../../auth/auth-context';
import { MaintenanceHistory } from './maintenance-history';
import axe from 'axe-core';

afterEach(() => vi.unstubAllGlobals());
const session = {
  status: 'authenticated' as const,
  mode: 'local' as const,
  getAccessToken: () => Promise.resolve('local.auditor'),
  signIn: () => Promise.resolve(),
  signOut: () => Promise.resolve(),
};
const event = (id: string, title: string) => ({
  id,
  action: 'MAINTENANCE_ORDER_UPDATED',
  actorDisplayName: 'Synthetic Operator',
  occurredAt: '2026-10-09T12:00:00.000Z',
  reasonCode: null,
  changes: [{ field: 'title', oldValue: 'Old synthetic title', newValue: title }],
});
const view = (orderId = 'order') => (
  <AuthSessionContext.Provider value={session}>
    <MemoryRouter>
      <MaintenanceHistory vesselId="vessel" orderId={orderId} />
    </MemoryRouter>
  </AuthSessionContext.Provider>
);
it('reaches older and newer pages with a read-only retry and keyboard focus on the loaded history', async () => {
  let olderReads = 0;
  const fetchMock = vi.fn((url: string) => {
    if (url.includes('cursor=')) {
      olderReads++;
      return Promise.resolve(
        olderReads === 1
          ? Response.json(
              {
                message: 'Synthetic history read failed',
                correlationId: 'synthetic-error',
              },
              { status: 503 },
            )
          : Response.json({
              items: [event('old', 'Older confirmed edit')],
              pageSize: 20,
              nextCursor: null,
            }),
      );
    }
    return Promise.resolve(
      Response.json({
        items: [event('new', 'Newest confirmed edit')],
        pageSize: 20,
        nextCursor: 'older-cursor',
      }),
    );
  });
  vi.stubGlobal('fetch', fetchMock);
  render(view());
  await screen.findByText('Newest confirmed edit');
  await userEvent.click(screen.getByRole('button', { name: 'Older history' }));
  await screen.findByText('Synthetic history read failed');
  await userEvent.click(screen.getByRole('button', { name: 'Retry history read' }));
  await screen.findByText('Older confirmed edit');
  expect(screen.getByRole('button', { name: 'Older history' })).toBeDisabled();
  await waitFor(() =>
    expect(screen.getByRole('heading', { name: 'Order history' })).toHaveFocus(),
  );
  await userEvent.click(screen.getByRole('button', { name: 'Newer history' }));
  await screen.findByText('Newest confirmed edit');
  expect(screen.getByRole('button', { name: 'Newer history' })).toBeDisabled();
  expect(fetchMock.mock.calls.every((call) => call[0].includes('/history'))).toBe(true);
});
it('ignores an old page response after changing orders and starts the new order on its newest page', async () => {
  let completeOld!: (response: Response) => void;
  let oldSignal: AbortSignal | undefined;
  const fetchMock = vi.fn((url: string, options: RequestInit) => {
    if (url.includes('cursor=')) {
      oldSignal = options.signal as AbortSignal;
      return new Promise<Response>((resolve) => {
        completeOld = resolve;
      });
    }
    return Promise.resolve(
      Response.json({
        items: [
          event(
            'new',
            url.includes('/other/') ? 'Other order event' : 'First order event',
          ),
        ],
        pageSize: 20,
        nextCursor: 'older-cursor',
      }),
    );
  });
  vi.stubGlobal('fetch', fetchMock);
  const rendered = render(view());
  await screen.findByText('First order event');
  await userEvent.click(screen.getByRole('button', { name: 'Older history' }));
  await waitFor(() => expect(completeOld).toBeDefined());
  expect(screen.getByRole('button', { name: 'Older history' })).toBeDisabled();
  rendered.rerender(view('other'));
  await screen.findByText('Other order event');
  expect(screen.getByText('History page 1')).toBeInTheDocument();
  expect(oldSignal?.aborted).toBe(true);
  await act(async () => {
    completeOld(
      Response.json({
        items: [event('late', 'Late old event')],
        pageSize: 20,
        nextCursor: null,
      }),
    );
    await Promise.resolve();
  });
  expect(screen.queryByText('Late old event')).not.toBeInTheDocument();
});
it('can leave a pending older page and ignores its late response', async () => {
  let complete!: (response: Response) => void;
  let signal: AbortSignal | undefined;
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string, options: RequestInit) => {
      if (url.includes('cursor=')) {
        signal = options.signal as AbortSignal;
        return new Promise<Response>((resolve) => {
          complete = resolve;
        });
      }
      return Promise.resolve(
        Response.json({
          items: [event('new', 'Current page edit')],
          pageSize: 20,
          nextCursor: 'older-cursor',
        }),
      );
    }),
  );
  render(view());
  await screen.findByText('Current page edit');
  await userEvent.click(screen.getByRole('button', { name: 'Older history' }));
  await waitFor(() => expect(complete).toBeDefined());
  await userEvent.click(screen.getByRole('button', { name: 'Newer history' }));
  await screen.findByText('Current page edit');
  expect(signal?.aborted).toBe(true);
  await act(async () => {
    complete(
      Response.json({
        items: [event('late', 'Late page edit')],
        pageSize: 20,
        nextCursor: null,
      }),
    );
    await Promise.resolve();
  });
  expect(screen.queryByText('Late page edit')).not.toBeInTheDocument();
});
it.each([403, 404, 401])(
  'shows the %s history failure without suggesting a mutation or retry',
  async (status) => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          Response.json(
            { message: 'Synthetic denied history', correlationId: 'safe-history-error' },
            { status },
          ),
        ),
    );
    render(view());
    await screen.findByText('Synthetic denied history');
    expect(screen.getByText('Error reference: safe-history-error')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Retry history read' }),
    ).not.toBeInTheDocument();
    if (status === 401)
      expect(screen.getByRole('link', { name: 'Sign in again' })).toHaveAttribute(
        'href',
        '/sign-in',
      );
  },
);
it('renders an accessible empty history and disables both page controls', async () => {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValue(Response.json({ items: [], pageSize: 20, nextCursor: null })),
  );
  const rendered = render(view());
  await screen.findByText('No recorded order history on this page.');
  expect(screen.getByRole('button', { name: 'Older history' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Newer history' })).toBeDisabled();
  expect(
    (
      await axe.run(rendered.container, {
        rules: { 'color-contrast': { enabled: false } },
      })
    ).violations,
  ).toEqual([]);
});
it('shows readable state changes and the recorded block reason', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(
      Response.json({
        items: [
          {
            ...event('blocked', 'unused'),
            action: 'MAINTENANCE_ORDER_TRANSITIONED',
            changes: [{ field: 'status', oldValue: 'IN_PROGRESS', newValue: 'BLOCKED' }],
            reasonCode: 'AWAITING_RESOURCES',
          },
        ],
        pageSize: 20,
        nextCursor: null,
      }),
    ),
  );
  const rendered = render(view());
  await screen.findByText('Reason: Awaiting resources');
  expect(screen.getByText('In progress')).toBeInTheDocument();
  expect(screen.getByText('Blocked')).toBeInTheDocument();
  expect(
    (
      await axe.run(rendered.container, {
        rules: { 'color-contrast': { enabled: false } },
      })
    ).violations,
  ).toEqual([]);
});
