import { render, screen, within, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import axe from 'axe-core';
import { AuthSessionContext } from '../../auth/auth-context';
import { VesselComposition } from './vessel-composition';
import { VesselAssignments } from './vessel-assignments';

const item = {
  assignmentId: 'plan',
  vesselId: 'vessel',
  crewMemberId: 'profile',
  crewNumber: 'KW-C-000001',
  displayName: 'Jordan Vale',
  role: 'DEMO_SUPPORT',
  roleLabel: 'Support role (demo)',
  startsOn: '2040-01-01',
  endsOn: '2040-01-31',
  consultedAt: '2026-10-09T12:00:00Z',
  status: 'INCOMPLETE',
  requirements: [
    {
      kind: 'DEMO_SAFETY',
      kindLabel: 'Safety familiarization (demo)',
      status: 'INCOMPLETE',
      reasonCode: 'COVERAGE_GAP',
      reason: 'Coverage is missing from 2040-01-16 through 2040-01-31.',
      firstGap: { startsOn: '2040-01-16', endsOn: '2040-01-31' },
      coverageEndsOn: null,
    },
  ],
};
const composition = {
  vessel: { id: 'vessel', status: 'ACTIVE' },
  date: '2040-01-05',
  role: null,
  consultedAt: item.consultedAt,
  page: 1,
  pageSize: 20,
  total: 1,
  totalPages: 1,
  items: [item],
};
function LocationProbe() {
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <>
      <output aria-label="Workspace URL">{location.search}</output>
      <button onClick={() => void navigate(-1)}>Back</button>
      <button onClick={() => void navigate(1)}>Forward</button>
    </>
  );
}
function show(
  url = '/app/vessels/vessel?compositionDate=2040-01-05&assignmentPage=2&profilePage=3',
  refreshVersion = 0,
  token = 'local.auditor',
) {
  return render(
    <AuthSessionContext.Provider
      value={{
        status: 'authenticated',
        mode: 'local',
        getAccessToken: () => Promise.resolve(token),
        signIn: () => Promise.resolve(),
        signOut: () => Promise.resolve(),
      }}
    >
      <MemoryRouter initialEntries={[url]}>
        <main>
          <VesselComposition vesselId="vessel" refreshVersion={refreshVersion} />
          <LocationProbe />
        </main>
      </MemoryRouter>
    </AuthSessionContext.Provider>,
  );
}
afterEach(() => vi.unstubAllGlobals());
it('refreshes composition after cancellation and recovers a failed read without repeating the write', async () => {
  let cancelled = false;
  let failed = false;
  const onSaved = vi.fn();
  const historyPlan = { id: 'plan', ...item, status: 'CURRENT', cancellation: null };
  const fetchMock = vi.fn((url: string, options: RequestInit) => {
    if (options.method === 'POST') {
      cancelled = true;
      return Promise.resolve(
        Response.json({ ...historyPlan, status: 'CANCELLED' }, { status: 201 }),
      );
    }
    if (url.includes('crew-composition')) {
      if (cancelled && !failed) {
        failed = true;
        return Promise.resolve(
          Response.json({ message: 'Read interrupted.' }, { status: 503 }),
        );
      }
      return Promise.resolve(
        Response.json({
          ...composition,
          items: cancelled ? [] : [item],
          total: cancelled ? 0 : 1,
        }),
      );
    }
    if (url.includes('crew-members'))
      return Promise.resolve(Response.json({ items: [], totalPages: 0 }));
    return Promise.resolve(
      Response.json({
        vessel: composition.vessel,
        asOf: composition.date,
        total: 1,
        totalPages: 1,
        page: 1,
        items: [
          {
            ...historyPlan,
            status: cancelled ? 'CANCELLED' : 'CURRENT',
            cancellation: cancelled
              ? { reasonLabel: 'Plan changed', cancelledAt: item.consultedAt }
              : null,
          },
        ],
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
          <VesselAssignments vesselId="vessel" canWrite onSaved={onSaved} />
        </main>
      </MemoryRouter>
    </AuthSessionContext.Provider>,
  );
  await screen.findByRole('heading', { name: 'Crew composition' });
  await screen.findByRole('heading', { name: 'Jordan Vale · KW-C-000001' });
  await userEvent.click(await screen.findByRole('button', { name: /Cancel plan/u }));
  await userEvent.selectOptions(
    screen.getByLabelText('Cancellation reason'),
    'PLAN_CHANGED',
  );
  await userEvent.click(screen.getByRole('button', { name: 'Confirm cancellation' }));
  expect(
    await screen.findByText(/Plan cancelled\. Original history retained/u),
  ).toBeInTheDocument();
  expect(await screen.findByText(/Crew composition unavailable/u)).toBeInTheDocument();
  expect(await screen.findByText('CANCELLED')).toBeInTheDocument();
  expect(onSaved).toHaveBeenCalledOnce();
  await userEvent.click(screen.getByRole('button', { name: 'Retry composition' }));
  expect(
    await screen.findByText('No assignment plans include this date.'),
  ).toBeInTheDocument();
  expect(
    screen.getByText(/Plan cancelled\. Original history retained/u),
  ).toBeInTheDocument();
  expect(
    fetchMock.mock.calls.filter(([, options]) => options.method === 'POST'),
  ).toHaveLength(1);
});
it.each(['local.auditor', 'local.operations-manager'])(
  'lets %s inspect full-plan gaps and follow the profile without write controls in composition',
  async (token) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(composition)));
    show(undefined, 0, token);
    expect(await screen.findByText('Jordan Vale · KW-C-000001')).toBeInTheDocument();
    expect(screen.getByText(item.requirements[0]!.reason)).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'View profile qualifications' }),
    ).toHaveAttribute('href', '/app/crew/profile');
    expect(screen.queryByRole('button', { name: 'Create plan' })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Cancel plan/u }),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/not confirmed boarding/u)).toBeInTheDocument();
    expect(
      (await axe.run(document.body, { rules: { 'color-contrast': { enabled: false } } }))
        .violations,
    ).toEqual([]);
  },
);

it('refreshes composition after creation while preserving confirmed success if the composition read fails', async () => {
  let saved = false;
  let failed = false;
  const onSaved = vi.fn();
  const fetchMock = vi.fn((url: string, options: RequestInit) => {
    if (options.method === 'POST') {
      saved = true;
      return Promise.resolve(Response.json({ id: 'plan' }, { status: 201 }));
    }
    if (url.includes('crew-members'))
      return Promise.resolve(
        Response.json({
          items: [
            {
              id: item.crewMemberId,
              displayName: item.displayName,
              crewNumber: item.crewNumber,
            },
          ],
          totalPages: 1,
        }),
      );
    if (url.includes('crew-composition')) {
      if (saved && !failed) {
        failed = true;
        return Promise.resolve(
          Response.json({ message: 'Read interrupted.' }, { status: 503 }),
        );
      }
      return Promise.resolve(
        Response.json({
          ...composition,
          total: saved ? 1 : 0,
          items: saved ? [item] : [],
        }),
      );
    }
    return Promise.resolve(
      Response.json({
        vessel: composition.vessel,
        asOf: composition.date,
        page: 1,
        total: saved ? 1 : 0,
        totalPages: saved ? 1 : 0,
        items: saved
          ? [{ ...item, id: 'plan', status: 'CURRENT', cancellation: null }]
          : [],
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
      <MemoryRouter
        initialEntries={[
          '/app/vessels/vessel?compositionDate=2040-01-05&compositionRole=DEMO_SUPPORT',
        ]}
      >
        <main>
          <VesselAssignments vesselId="vessel" canWrite onSaved={onSaved} />
          <LocationProbe />
        </main>
      </MemoryRouter>
    </AuthSessionContext.Provider>,
  );
  await userEvent.click(await screen.findByRole('radio', { name: /Jordan Vale/u }));
  await userEvent.type(screen.getByLabelText('Starts on'), '2040-01-01');
  await userEvent.type(screen.getByLabelText('Ends on'), '2040-01-31');
  await userEvent.click(screen.getByRole('button', { name: 'Create plan' }));
  await screen.findByText(/Crew composition unavailable/u);
  expect(screen.getByText(/Plan saved/u)).toBeInTheDocument();
  expect(await screen.findByText('CURRENT')).toBeInTheDocument();
  expect(onSaved).toHaveBeenCalledOnce();
  await userEvent.click(screen.getByRole('button', { name: 'Retry composition' }));
  expect(
    await screen.findByRole('heading', { name: /Jordan Vale/u }),
  ).toBeInTheDocument();
  expect(screen.getByText(/Plan saved/u)).toBeInTheDocument();
  expect(screen.getByLabelText('Workspace URL')).toHaveTextContent(
    'compositionDate=2040-01-05',
  );
  expect(screen.getByLabelText('Workspace URL')).toHaveTextContent(
    'compositionRole=DEMO_SUPPORT',
  );
  expect(
    fetchMock.mock.calls.filter(([, options]) => options.method === 'POST'),
  ).toHaveLength(1);
});

it('keeps filter and page URL state isolated and restores it with back/forward', async () => {
  const fetchMock = vi.fn((url: string) => {
    const query = new URL(url, 'http://localhost').searchParams;
    return Promise.resolve(
      Response.json({
        ...composition,
        page: Number(query.get('page')),
        role: query.get('role'),
        date: query.get('date') ?? '2026-10-09',
        total: 21,
        totalPages: 2,
      }),
    );
  });
  vi.stubGlobal('fetch', fetchMock);
  show();
  await screen.findByRole('heading', { name: /Jordan Vale/u });
  await userEvent.click(
    within(screen.getByRole('navigation', { name: 'Crew composition pages' })).getByRole(
      'button',
      { name: 'Next' },
    ),
  );
  await screen.findByText('Page 2 of 2');
  await userEvent.selectOptions(screen.getByLabelText('Demo function'), 'DEMO_DECK');
  await userEvent.click(
    screen.getByRole('button', { name: 'Apply composition filters' }),
  );
  await screen.findByText('Page 1 of 2');
  let params = new URLSearchParams(screen.getByLabelText('Workspace URL').textContent);
  expect(params.get('compositionRole')).toBe('DEMO_DECK');
  expect(params.has('compositionPage')).toBe(false);
  expect(params.get('assignmentPage')).toBe('2');
  expect(params.get('profilePage')).toBe('3');
  await userEvent.click(screen.getByRole('button', { name: 'Back' }));
  await screen.findByText('Page 2 of 2');
  expect(screen.getByLabelText('Demo function')).toHaveValue('');
  await userEvent.click(screen.getByRole('button', { name: 'Forward' }));
  await screen.findByText('Page 1 of 2');
  expect(screen.getByLabelText('Demo function')).toHaveValue('DEMO_DECK');
  await userEvent.clear(screen.getByLabelText('Composition date (UTC)'));
  await userEvent.type(screen.getByLabelText('Composition date (UTC)'), '2040-02-01');
  await userEvent.click(
    screen.getByRole('button', { name: 'Apply composition filters' }),
  );
  await screen.findByText(/Selected day: 2040-02-01/u);
  params = new URLSearchParams(screen.getByLabelText('Workspace URL').textContent);
  expect(params.get('compositionDate')).toBe('2040-02-01');
  expect(fetchMock.mock.calls.some(([url]) => url.includes('role=DEMO_DECK'))).toBe(true);
});

it('preserves unapplied filters while paging through the current results', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) =>
      Promise.resolve(
        Response.json({
          ...composition,
          page: Number(new URL(url, 'http://localhost').searchParams.get('page')),
          total: 21,
          totalPages: 2,
        }),
      ),
    ),
  );
  show();
  await screen.findByRole('heading', { name: /Jordan Vale/u });
  await userEvent.selectOptions(screen.getByLabelText('Demo function'), 'DEMO_SUPPORT');
  await userEvent.click(
    within(screen.getByRole('navigation', { name: 'Crew composition pages' })).getByRole(
      'button',
      { name: 'Next' },
    ),
  );
  await screen.findByText('Page 2 of 2');
  expect(screen.getByLabelText('Demo function')).toHaveValue('DEMO_SUPPORT');
  expect(
    new URLSearchParams(screen.getByLabelText('Workspace URL').textContent).has(
      'compositionRole',
    ),
  ).toBe(false);
});

it.each([
  ['?compositionDate=2040-01-05', 1, null, 'No assignment plans include this date.'],
  [
    '?compositionRole=DEMO_SUPPORT',
    1,
    'DEMO_SUPPORT',
    'No plans match this date and function.',
  ],
  [
    '?compositionPage=9',
    9,
    null,
    'No plans on this composition page. Return to page one.',
  ],
])(
  'distinguishes no matches from an out-of-range composition page (%s)',
  async (url, page, role, message) => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        Response.json({
          ...composition,
          role,
          page,
          items: [],
          total: 0,
          totalPages: 0,
        }),
      ),
    );
    show(`/app/vessels/vessel${url}`);
    expect(await screen.findByText(message)).toBeInTheDocument();
    if (page > 1) {
      await userEvent.click(
        screen.getByRole('button', { name: 'First composition page' }),
      );
      expect(screen.getByLabelText('Workspace URL')).toHaveTextContent(
        'compositionPage=1',
      );
    }
  },
);

it.each([401, 403, 404, 400, 503])(
  'shows safe errors instead of successful coverage or emptiness (%s)',
  async (status) => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        Response.json(
          {
            message: 'Synthetic failure.',
            fieldErrors: status === 400 ? { date: ['Use a calendar date.'] } : undefined,
          },
          { status, headers: { 'x-correlation-id': 'demo-read' } },
        ),
      ),
    );
    show();
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Synthetic failure.');
    expect(alert).toHaveTextContent('demo-read');
    expect(
      screen.queryByText('No assignment plans include this date.'),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('Coverage without warning')).not.toBeInTheDocument();
    if (status === 503)
      expect(
        screen.getByRole('button', { name: 'Retry composition' }),
      ).toBeInTheDocument();
    else
      expect(
        screen.queryByRole('button', { name: 'Retry composition' }),
      ).not.toBeInTheDocument();
  },
);

it.each([
  'compositionDate=2026-02-29',
  'compositionDate=0000-01-01',
  'compositionRole=unknown',
  'compositionPage=0',
  'compositionPage=NaN',
])('allows correcting malformed URL state without querying it (%s)', async (query) => {
  const fetchMock = vi.fn().mockResolvedValue(Response.json(composition));
  vi.stubGlobal('fetch', fetchMock);
  show(`/app/vessels/vessel?${query}&assignmentPage=4`);
  expect(screen.getByRole('alert')).toHaveTextContent('Invalid composition URL.');
  expect(fetchMock).not.toHaveBeenCalled();
  await userEvent.click(
    screen.getByRole('button', { name: 'Apply composition filters' }),
  );
  await screen.findByRole('heading', { name: /Jordan Vale/u });
  expect(screen.getByLabelText('Workspace URL')).toHaveTextContent('assignmentPage=4');
});

it('defaults an omitted date on the server and refreshes changed current evidence using reads only', async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(Response.json(composition))
    .mockResolvedValueOnce(
      Response.json({
        ...composition,
        items: [
          {
            ...item,
            status: 'COVERED',
            requirements: [
              {
                ...item.requirements[0],
                status: 'COVERED',
                reason: 'The full planned period is covered through 2040-03-01.',
              },
            ],
          },
        ],
      }),
    );
  vi.stubGlobal('fetch', fetchMock);
  show('/app/vessels/vessel');
  await screen.findByText(item.requirements[0]!.reason);
  expect(screen.getByLabelText('Composition date (UTC)')).toHaveValue('');
  expect(fetchMock.mock.calls[0]![0]).not.toContain('date=');
  await userEvent.click(screen.getByRole('button', { name: 'Refresh composition' }));
  await screen.findByText('The full planned period is covered through 2040-03-01.');
  expect(screen.queryByText(item.requirements[0]!.reason)).not.toBeInTheDocument();
  expect(
    fetchMock.mock.calls.every(([, options]) => !(options as RequestInit).method),
  ).toBe(true);
});

it('discards a late obsolete response after filters change and aborts requests on exit', async () => {
  let finish: ((response: Response) => void) | undefined;
  const fetchMock = vi
    .fn()
    .mockImplementationOnce(
      () =>
        new Promise<Response>((resolve) => {
          finish = resolve;
        }),
    )
    .mockResolvedValue(
      Response.json({
        ...composition,
        items: [{ ...item, displayName: 'New synthetic result' }],
      }),
    );
  vi.stubGlobal('fetch', fetchMock);
  const view = show();
  expect(screen.getByText('Loading crew composition…')).toBeInTheDocument();
  await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
  await userEvent.selectOptions(screen.getByLabelText('Demo function'), 'DEMO_SUPPORT');
  await userEvent.click(
    screen.getByRole('button', { name: 'Apply composition filters' }),
  );
  await screen.findByRole('heading', { name: /New synthetic result/u });
  expect((fetchMock.mock.calls[0]![1] as RequestInit).signal!.aborted).toBe(true);
  act(() => {
    finish!(Response.json(composition));
  });
  expect(screen.queryByRole('heading', { name: /Jordan Vale/u })).not.toBeInTheDocument();
  view.unmount();
  expect((fetchMock.mock.calls[1]![1] as RequestInit).signal!.aborted).toBe(true);
});
