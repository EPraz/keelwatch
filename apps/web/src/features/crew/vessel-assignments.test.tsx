import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import axe from 'axe-core';
import { AuthSessionContext } from '../../auth/auth-context';
import { VesselAssignments } from './vessel-assignments';

const member = {
  id: 'profile',
  displayName: 'Jordan Vale',
  crewNumber: 'KW-C-000001',
  createdAt: '2026-10-08',
};
const workspace = {
  vessel: { id: 'vessel', status: 'ACTIVE' },
  asOf: '2026-10-08',
  items: [],
  total: 0,
  page: 1,
  totalPages: 0,
};
function stubFetch(fetchMock: (url: string, options: RequestInit) => unknown) {
  vi.stubGlobal('fetch', (url: string, options: RequestInit) =>
    url.includes('crew-composition')
      ? Promise.resolve(
          Response.json({
            ...workspace,
            date: workspace.asOf,
            role: null,
            consultedAt: '2026-10-08T00:00:00Z',
          }),
        )
      : fetchMock(url, options),
  );
}
function show(canWrite = true, onSaved = vi.fn()) {
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
        <VesselAssignments vesselId="vessel" canWrite={canWrite} onSaved={onSaved} />
      </MemoryRouter>
    </AuthSessionContext.Provider>,
  );
}
afterEach(() => vi.unstubAllGlobals());
describe('Vessel assignment plans', () => {
  it('selects an existing synthetic profile and records a plan with visible demo limits', async () => {
    let saved = false;
    const onSaved = vi.fn();
    const fetchMock = vi.fn((url: string, options: RequestInit) => {
      if (url.includes('crew-members'))
        return Promise.resolve(
          Response.json({ items: [member], page: 1, totalPages: 1 }),
        );
      if (options.method === 'POST') {
        saved = true;
        return Promise.resolve(Response.json({ id: 'plan' }, { status: 201 }));
      }
      return Promise.resolve(
        Response.json({
          ...workspace,
          items: saved
            ? [
                {
                  ...member,
                  id: 'plan',
                  roleLabel: 'Deck role (demo)',
                  startsOn: '2040-02-01',
                  endsOn: '2040-02-02',
                  status: 'SCHEDULED',
                },
              ]
            : [],
        }),
      );
    });
    stubFetch(fetchMock);
    show(true, onSaved);
    expect(await screen.findByText(/No assignment plans yet/u)).toBeInTheDocument();
    await userEvent.click(await screen.findByRole('radio', { name: /Jordan Vale/u }));
    await userEvent.type(screen.getByLabelText('Starts on'), '2040-02-01');
    await userEvent.type(screen.getByLabelText('Ends on'), '2040-02-02');
    await userEvent.click(screen.getByRole('button', { name: 'Create plan' }));
    expect(await screen.findByText(/Plan saved/u)).toBeInTheDocument();
    expect(await screen.findByText('SCHEDULED')).toBeInTheDocument();
    expect(screen.getByText(/evaluation is advisory/u)).toBeInTheDocument();
    expect(onSaved).toHaveBeenCalledOnce();
    const write = fetchMock.mock.calls.find(([, options]) => options.method === 'POST');
    expect(JSON.parse(write![1].body as string)).toEqual({
      crewNumber: member.crewNumber,
      role: 'DEMO_DECK',
      startsOn: '2040-02-01',
      endsOn: '2040-02-02',
    });
  });

  it('keeps the selected profile across URL-backed pages without submitting the form', async () => {
    const fetchMock = vi.fn((url: string) =>
      Promise.resolve(
        Response.json(
          url.includes('crew-members')
            ? {
                items: url.includes('page=2') ? [] : [member],
                page: url.includes('page=2') ? 2 : 1,
                totalPages: 2,
              }
            : workspace,
        ),
      ),
    );
    stubFetch(fetchMock);
    show();
    await userEvent.click(await screen.findByRole('radio', { name: /Jordan Vale/u }));
    await userEvent.type(screen.getByLabelText('Starts on'), '2040-02-01');
    await userEvent.type(screen.getByLabelText('Ends on'), '2040-02-02');
    await userEvent.click(
      within(
        screen.getByRole('navigation', { name: 'Profile selector pages' }),
      ).getByRole('button', { name: 'Next' }),
    );
    expect(await screen.findByText(/No profiles on this page/u)).toBeInTheDocument();
    expect(screen.getByText(/Selected: Jordan Vale/u)).toBeInTheDocument();
    expect(screen.getByLabelText('Starts on')).toHaveValue('2040-02-01');
    expect(screen.queryByText(/Plan saved/u)).not.toBeInTheDocument();
  });

  it('focuses validation, retains conflict fields and correlation, and prevents duplicate pending writes', async () => {
    let finish: ((response: Response) => void) | undefined;
    const fetchMock = vi.fn((url: string, options: RequestInit) =>
      options.method === 'POST'
        ? new Promise<Response>((resolve) => {
            finish = resolve;
          })
        : Promise.resolve(
            Response.json(
              url.includes('crew-members')
                ? { items: [member], totalPages: 1 }
                : workspace,
            ),
          ),
    );
    stubFetch(fetchMock);
    show();
    await screen.findByRole('radio', { name: /Jordan Vale/u });
    await userEvent.click(screen.getByRole('button', { name: 'Create plan' }));
    expect(screen.getByRole('alert')).toHaveFocus();
    expect(screen.getByLabelText('Starts on')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('radio', { name: /Jordan Vale/u })).toHaveAttribute(
      'aria-describedby',
      'assignment-error',
    );
    expect(
      (await axe.run(document.body, { rules: { 'color-contrast': { enabled: false } } }))
        .violations,
    ).toEqual([]);
    await userEvent.click(screen.getByRole('radio', { name: /Jordan Vale/u }));
    await userEvent.type(screen.getByLabelText('Starts on'), '2040-02-01');
    await userEvent.type(screen.getByLabelText('Ends on'), '2040-02-02');
    await userEvent.dblClick(screen.getByRole('button', { name: 'Create plan' }));
    expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled();
    expect(
      fetchMock.mock.calls.filter(([, options]) => options.method === 'POST'),
    ).toHaveLength(1);
    finish!(
      Response.json(
        {
          message: 'Already reserved.',
          fieldErrors: { startsOn: ['Choose another period.'] },
        },
        { status: 409, headers: { 'x-correlation-id': 'demo-reference' } },
      ),
    );
    expect(
      (await screen.findByText(/Already reserved.*demo-reference/u)).closest(
        '[role="alert"]',
      ),
    ).toHaveFocus();
    expect(screen.getByLabelText('Starts on')).toHaveValue('2040-02-01');
    expect(screen.getByLabelText('Starts on')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText(/Selected: Jordan Vale/u)).toBeInTheDocument();
  });

  it('preserves confirmed success if the subsequent history read fails and retries only that read', async () => {
    let saved = false;
    let failed = false;
    const fetchMock = vi.fn((url: string, options: RequestInit) => {
      if (url.includes('crew-members'))
        return Promise.resolve(Response.json({ items: [member], totalPages: 1 }));
      if (options.method === 'POST') {
        saved = true;
        return Promise.resolve(Response.json({ id: 'plan' }, { status: 201 }));
      }
      if (saved && !failed) {
        failed = true;
        return Promise.resolve(
          Response.json({ message: 'History unavailable.' }, { status: 503 }),
        );
      }
      return Promise.resolve(Response.json(workspace));
    });
    stubFetch(fetchMock);
    show();
    await userEvent.click(await screen.findByRole('radio', { name: /Jordan Vale/u }));
    await userEvent.type(screen.getByLabelText('Starts on'), '2040-02-01');
    await userEvent.type(screen.getByLabelText('Ends on'), '2040-02-02');
    await userEvent.click(screen.getByRole('button', { name: 'Create plan' }));
    expect(await screen.findByText('History unavailable.')).toBeInTheDocument();
    expect(screen.getByText(/Plan saved/u)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Retry history' }));
    await screen.findByText(/No assignment plans yet/u);
    expect(
      fetchMock.mock.calls.filter(([, options]) => options.method === 'POST'),
    ).toHaveLength(1);
  });

  it.each([403, 404])(
    'shows terminal history errors without write controls for %s',
    async (status) => {
      stubFetch(
        vi
          .fn()
          .mockResolvedValue(
            Response.json({ message: 'Access unavailable.' }, { status }),
          ),
      );
      show();
      await screen.findByText('Access unavailable.');
      expect(
        screen.queryByRole('button', { name: 'Retry history' }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: 'Create plan' }),
      ).not.toBeInTheDocument();
    },
  );

  it('shows Auditor history without loading the profile selector', async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json(workspace));
    stubFetch(fetchMock);
    show(false);
    await screen.findByText(/Read-only plans/u);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole('button', { name: 'Create plan' })).not.toBeInTheDocument();
  });

  it('navigates history beyond 20 plans through URL state and returns to the first page', async () => {
    const plan = {
      ...member,
      roleLabel: 'Deck role (demo)',
      startsOn: '2040-02-01',
      endsOn: '2040-02-02',
      status: 'SCHEDULED',
      cancellation: null,
    };
    const fetchMock = vi.fn((url: string) =>
      Promise.resolve(
        Response.json({
          ...workspace,
          total: 21,
          totalPages: 2,
          page: url.includes('page=2') ? 2 : 1,
          items: url.includes('page=2')
            ? [{ ...plan, id: 'older', displayName: 'Older synthetic plan' }]
            : Array.from({ length: 20 }, (_, index) => ({
                ...plan,
                id: `plan-${index}`,
              })),
        }),
      ),
    );
    stubFetch(fetchMock);
    show(false);
    await screen.findByText('Page 1 of 2');
    await userEvent.click(
      within(
        screen.getByRole('navigation', {
          name: 'Assignment history pages',
        }),
      ).getByRole('button', { name: 'Next' }),
    );
    expect(await screen.findByText(/Older synthetic plan/u)).toBeInTheDocument();
    expect(screen.getByText('Page 2 of 2')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Previous' }));
    await screen.findByText('Page 1 of 2');
    expect(screen.queryByText(/Older synthetic plan/u)).not.toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([url]) => url.endsWith('page=2'))).toBe(true);
  });

  it('requires a closed reason and confirmation before cancelling, then refreshes preserved history', async () => {
    let cancelled = false;
    const plan = {
      ...member,
      id: 'plan',
      roleLabel: 'Deck role (demo)',
      startsOn: '2040-02-01',
      endsOn: '2040-02-02',
      status: 'SCHEDULED',
    };
    const fetchMock = vi.fn((url: string, options: RequestInit) => {
      if (url.includes('crew-members'))
        return Promise.resolve(Response.json({ items: [member], totalPages: 1 }));
      if (options.method === 'POST') {
        cancelled = true;
        return Promise.resolve(
          Response.json({ ...plan, status: 'CANCELLED' }, { status: 201 }),
        );
      }
      return Promise.resolve(
        Response.json({
          ...workspace,
          total: 1,
          items: [
            {
              ...plan,
              status: cancelled ? 'CANCELLED' : 'SCHEDULED',
              cancellation: cancelled
                ? { reasonLabel: 'Plan changed', cancelledAt: '2026-10-08T00:00:00Z' }
                : null,
            },
          ],
        }),
      );
    });
    stubFetch(fetchMock);
    show();
    await userEvent.click(
      await screen.findByRole('button', { name: /Cancel plan.*KW-C-000001/u }),
    );
    expect(screen.getByText(/This invalidates the entire plan/u)).toBeInTheDocument();
    expect(screen.getByLabelText('Cancellation reason')).toHaveFocus();
    await userEvent.click(screen.getByRole('button', { name: 'Keep plan' }));
    expect(
      screen.getByRole('button', { name: /Cancel plan.*KW-C-000001/u }),
    ).toHaveFocus();
    expect(screen.queryByLabelText('Cancellation reason')).not.toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', { name: /Cancel plan.*KW-C-000001/u }),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Confirm cancellation' }));
    expect(screen.getByRole('alert')).toHaveFocus();
    expect(fetchMock.mock.calls.some(([, options]) => options.method === 'POST')).toBe(
      false,
    );
    await userEvent.selectOptions(
      screen.getByLabelText('Cancellation reason'),
      'PLAN_CHANGED',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Confirm cancellation' }));
    expect(await screen.findByText(/Plan cancelled/u)).toBeInTheDocument();
    expect(await screen.findByText('CANCELLED')).toBeInTheDocument();
    expect(screen.getByText(/Plan changed.*2026-10-08/u)).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Cancel plan.*KW-C-000001/u }),
    ).not.toBeInTheDocument();
    const write = fetchMock.mock.calls.find(([, options]) => options.method === 'POST');
    expect(write![0]).toMatch(/\/plan\/cancellation$/u);
    expect(JSON.parse(write![1].body as string)).toEqual({ reason: 'PLAN_CHANGED' });
  });
});
