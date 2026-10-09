import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import { AuthSessionContext } from '../../auth/auth-context';
import { AssignmentForm } from './assignment-form';
import axe from 'axe-core';

const member = { id: 'profile', displayName: 'Jordan Vale', crewNumber: 'KW-C-000001' };
function show() {
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
          <AssignmentForm vesselId="vessel" onSaved={vi.fn()} />
        </main>
      </MemoryRouter>
    </AuthSessionContext.Provider>,
  );
}
async function completeDraft() {
  await userEvent.click(await screen.findByRole('radio', { name: /Jordan Vale/u }));
  await userEvent.type(screen.getByLabelText('Starts on'), '2040-01-01');
  await userEvent.type(screen.getByLabelText('Ends on'), '2040-01-31');
}
const covered = {
  status: 'COVERED',
  crewMemberId: member.id,
  consultedAt: '2026-10-08T12:00:00Z',
  startsOn: '2040-01-01',
  endsOn: '2040-01-31',
  requirements: [
    {
      kind: 'DEMO_SAFETY',
      kindLabel: 'Safety familiarization (demo)',
      status: 'COVERED',
      reason: 'The full planned period is covered through 2041-01-01.',
    },
  ],
};
afterEach(() => vi.unstubAllGlobals());
it('explicitly evaluates a valid draft, explains missing coverage, and still permits saving', async () => {
  const fetchMock = vi.fn((url: string, options: RequestInit) =>
    Promise.resolve(
      Response.json(
        url.includes('requirement-evaluation')
          ? {
              status: 'INCOMPLETE',
              consultedAt: '2026-10-08T12:00:00Z',
              crewMemberId: member.id,
              startsOn: '2040-01-01',
              endsOn: '2040-01-31',
              requirements: [
                {
                  kind: 'DEMO_SAFETY',
                  kindLabel: 'Safety familiarization (demo)',
                  status: 'INCOMPLETE',
                  reason: 'No records of this required demo qualification.',
                },
              ],
            }
          : options.method === 'POST'
            ? { id: 'plan' }
            : { items: [member], totalPages: 1 },
      ),
    ),
  );
  vi.stubGlobal('fetch', fetchMock);
  show();
  expect(screen.getByRole('button', { name: 'Evaluate requirements' })).toBeDisabled();
  await userEvent.click(await screen.findByRole('radio', { name: /Jordan Vale/u }));
  await userEvent.type(screen.getByLabelText('Starts on'), '2040-01-01');
  await userEvent.type(screen.getByLabelText('Ends on'), '2040-01-31');
  expect(
    fetchMock.mock.calls.some(([url]) => url.includes('requirement-evaluation')),
  ).toBe(false);
  await userEvent.click(screen.getByRole('button', { name: 'Evaluate requirements' }));
  expect(await screen.findAllByText('Incomplete coverage')).toHaveLength(2);
  expect(
    screen.getByText('No records of this required demo qualification.'),
  ).toBeInTheDocument();
  expect(
    screen.getByRole('link', { name: 'View profile qualifications' }),
  ).toHaveAttribute('href', '/app/crew/profile');
  await userEvent.click(screen.getByRole('button', { name: 'Create plan' }));
  expect(screen.queryAllByText('Incomplete coverage')).toHaveLength(0);
  expect(
    fetchMock.mock.calls.filter(([, options]) => options.method === 'POST'),
  ).toHaveLength(1);
});

it('invalidates an in-flight preview, ignores obsolete responses and allows saving during evaluation', async () => {
  const responses: ((response: Response) => void)[] = [];
  const signals: AbortSignal[] = [];
  const fetchMock = vi.fn((url: string, options: RequestInit) => {
    if (url.includes('requirement-evaluation')) {
      signals.push(options.signal as AbortSignal);
      return new Promise<Response>((resolve) => responses.push(resolve));
    }
    return Promise.resolve(
      Response.json(
        options.method === 'POST' ? { id: 'plan' } : { items: [member], totalPages: 1 },
      ),
    );
  });
  vi.stubGlobal('fetch', fetchMock);
  show();
  await completeDraft();
  await userEvent.dblClick(screen.getByRole('button', { name: 'Evaluate requirements' }));
  expect(responses).toHaveLength(1);
  expect(screen.getByRole('button', { name: 'Create plan' })).toBeEnabled();
  await userEvent.selectOptions(
    screen.getByLabelText('Onboard function (demo)'),
    'DEMO_SUPPORT',
  );
  expect(signals[0]!.aborted).toBe(true);
  await userEvent.click(screen.getByRole('button', { name: 'Evaluate requirements' }));
  await act(async () => {
    responses[0]!(Response.json(covered));
    await Promise.resolve();
  });
  expect(screen.queryAllByText('Coverage without warning')).toHaveLength(0);
  expect(screen.getByRole('button', { name: 'Evaluating…' })).toBeDisabled();
  await userEvent.click(screen.getByRole('button', { name: 'Create plan' }));
  expect(signals[1]!.aborted).toBe(true);
  await act(async () => {
    responses[1]!(Response.json(covered));
    await Promise.resolve();
  });
  expect(screen.queryAllByText('Coverage without warning')).toHaveLength(0);
  expect(
    fetchMock.mock.calls.filter(([, options]) => options.method === 'POST'),
  ).toHaveLength(1);
});

it('shows failure and correlation, retains the draft, retries only the read and permits saving after failure', async () => {
  let reads = 0;
  const fetchMock = vi.fn((url: string, options: RequestInit) => {
    if (url.includes('requirement-evaluation')) {
      reads += 1;
      return Promise.resolve(
        reads === 1
          ? Response.json(
              { message: 'Synthetic read unavailable.' },
              { status: 503, headers: { 'x-correlation-id': 'demo-read' } },
            )
          : Response.json(covered),
      );
    }
    return Promise.resolve(
      Response.json(
        options.method === 'POST' ? { id: 'plan' } : { items: [member], totalPages: 1 },
      ),
    );
  });
  vi.stubGlobal('fetch', fetchMock);
  show();
  await completeDraft();
  await userEvent.click(screen.getByRole('button', { name: 'Evaluate requirements' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Evaluation unavailable');
  expect(screen.getByText('Reference: demo-read')).toBeInTheDocument();
  expect(screen.getByLabelText('Starts on')).toHaveValue('2040-01-01');
  expect(screen.getByRole('button', { name: 'Create plan' })).toBeEnabled();
  await userEvent.click(screen.getByRole('button', { name: 'Retry evaluation' }));
  expect(await screen.findAllByText('Coverage without warning')).toHaveLength(2);
  expect(
    fetchMock.mock.calls.filter(([, options]) => options.method === 'POST'),
  ).toHaveLength(0);
  expect(
    (await axe.run(document.body, { rules: { 'color-contrast': { enabled: false } } }))
      .violations,
  ).toEqual([]);
  await userEvent.clear(screen.getByLabelText('Ends on'));
  expect(screen.queryAllByText('Coverage without warning')).toHaveLength(0);
  expect(screen.getByRole('button', { name: 'Evaluate requirements' })).toBeDisabled();
});

it.each([401, 403, 404])(
  'distinguishes HTTP %s from missing coverage and still preserves independent save validation',
  async (status) => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) =>
        Promise.resolve(
          url.includes('requirement-evaluation')
            ? Response.json({ message: `Synthetic HTTP ${status}.` }, { status })
            : Response.json({ items: [member], totalPages: 1 }),
        ),
      ),
    );
    show();
    await completeDraft();
    await userEvent.click(screen.getByRole('button', { name: 'Evaluate requirements' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      `Synthetic HTTP ${status}`,
    );
    expect(
      screen.queryByRole('button', { name: 'Retry evaluation' }),
    ).not.toBeInTheDocument();
    expect(screen.queryAllByText('Coverage without warning')).toHaveLength(0);
    expect(screen.getByRole('button', { name: 'Create plan' })).toBeEnabled();
  },
);

it('can save after evaluation fails, without retrying either operation automatically', async () => {
  const fetchMock = vi.fn((url: string, options: RequestInit) =>
    Promise.resolve(
      url.includes('requirement-evaluation')
        ? Response.json({ message: 'Read unavailable.' }, { status: 503 })
        : Response.json(
            options.method === 'POST'
              ? { id: 'plan' }
              : { items: [member], totalPages: 1 },
          ),
    ),
  );
  vi.stubGlobal('fetch', fetchMock);
  show();
  await completeDraft();
  await userEvent.click(screen.getByRole('button', { name: 'Evaluate requirements' }));
  await screen.findByRole('alert');
  await userEvent.click(screen.getByRole('button', { name: 'Create plan' }));
  expect(
    fetchMock.mock.calls.filter(([, options]) => options.method === 'POST'),
  ).toHaveLength(1);
  expect(
    fetchMock.mock.calls.filter(([url]) => url.includes('requirement-evaluation')),
  ).toHaveLength(1);
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

it('aborts a pending read on leaving the form', async () => {
  let signal: AbortSignal | undefined;
  let finish: ((response: Response) => void) | undefined;
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string, options: RequestInit) => {
      if (url.includes('requirement-evaluation')) {
        signal = options.signal as AbortSignal;
        return new Promise<Response>((resolve) => {
          finish = resolve;
        });
      }
      return Promise.resolve(Response.json({ items: [member], totalPages: 1 }));
    }),
  );
  const view = show();
  await completeDraft();
  await userEvent.click(screen.getByRole('button', { name: 'Evaluate requirements' }));
  view.unmount();
  expect(signal?.aborted).toBe(true);
  await act(async () => {
    finish!(Response.json(covered));
    await Promise.resolve();
  });
});

it('aborts reads when leaving the view and invalidates a completed result on date or profile changes', async () => {
  let signal: AbortSignal | undefined;
  const other = {
    ...member,
    id: 'other',
    crewNumber: 'KW-C-000002',
    displayName: 'Avery Chen',
  };
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string, options: RequestInit) => {
      if (url.includes('requirement-evaluation')) {
        signal = options.signal as AbortSignal;
        return Promise.resolve(Response.json(covered));
      }
      return Promise.resolve(Response.json({ items: [member, other], totalPages: 1 }));
    }),
  );
  const view = show();
  await completeDraft();
  await userEvent.click(screen.getByRole('button', { name: 'Evaluate requirements' }));
  await screen.findAllByText('Coverage without warning');
  await userEvent.clear(screen.getByLabelText('Starts on'));
  expect(screen.queryAllByText('Coverage without warning')).toHaveLength(0);
  await userEvent.type(screen.getByLabelText('Starts on'), '2040-01-01');
  await userEvent.click(screen.getByRole('button', { name: 'Evaluate requirements' }));
  await screen.findAllByText('Coverage without warning');
  await userEvent.click(screen.getByRole('radio', { name: /Avery Chen/u }));
  expect(screen.queryAllByText('Coverage without warning')).toHaveLength(0);
  await userEvent.click(screen.getByRole('button', { name: 'Evaluate requirements' }));
  await waitFor(() => expect(signal).toBeDefined());
  view.unmount();
});
