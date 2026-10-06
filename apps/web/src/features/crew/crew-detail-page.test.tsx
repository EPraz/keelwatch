import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthSessionContext } from '../../auth/auth-context';
import { CrewDetailPage } from './crew-detail-page';

const member = {
  id: 'crew-demo',
  displayName: 'Jordan Vale',
  crewNumber: 'KW-C-000001',
  createdAt: '2026-10-06T00:00:00Z',
};
const empty = { member, asOf: '2026-10-06', items: [], total: 0, page: 1, totalPages: 0 };
const qualification = {
  id: 'qualification',
  kind: 'DEMO_SAFETY',
  kindLabel: 'Safety familiarization (demo)',
  referenceNumber: 'KW-Q-000001',
  validFrom: '2026-10-01',
  expiresOn: '2027-10-01',
  status: 'VALID',
  reason: 'Valid through 2027-10-01.',
  asOf: '2026-10-06',
};
function show(permissions = ['crew:read', 'crew:write']) {
  function Shell() {
    return <Outlet context={{ user: { permissions } }} />;
  }
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
      <MemoryRouter initialEntries={['/app/crew/crew-demo']}>
        <Routes>
          <Route path="/app" element={<Shell />}>
            <Route path="crew/:crewMemberId" element={<CrewDetailPage />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthSessionContext.Provider>,
  );
}
async function fill() {
  await userEvent.type(screen.getByLabelText('Qualification reference'), 'KW-Q-000001');
  await userEvent.type(screen.getByLabelText('Valid from'), '2026-10-01');
  await userEvent.type(screen.getByLabelText('Expires on'), '2027-10-01');
}
afterEach(() => vi.unstubAllGlobals());
describe('Crew qualifications', () => {
  it('shows loading, empty and accessible validation without issuing a write', async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json(empty));
    vi.stubGlobal('fetch', fetchMock);
    show();
    expect(screen.getByText('Loading qualifications…')).toBeInTheDocument();
    expect(await screen.findByText(/No qualifications yet/u)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Record qualification' }));
    expect(screen.getByRole('alert')).toHaveFocus();
    expect(screen.getByLabelText('Valid from')).toHaveAttribute('aria-invalid', 'true');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(
      (await axe.run(document.body, { rules: { 'color-contrast': { enabled: false } } }))
        .violations,
    ).toEqual([]);
  });
  it('retains duplicate input and records success with refreshed validity', async () => {
    let attempts = 0;
    let saved = false;
    vi.stubGlobal(
      'fetch',
      vi.fn((_url: string, options: RequestInit) => {
        if (options.method === 'POST') {
          attempts++;
          if (attempts === 1)
            return Promise.resolve(
              Response.json(
                {
                  message:
                    'This qualification reference is already recorded for this crew profile.',
                },
                { status: 409 },
              ),
            );
          saved = true;
          return Promise.resolve(Response.json(qualification, { status: 201 }));
        }
        return Promise.resolve(
          Response.json(
            saved ? { ...empty, items: [qualification], total: 1, totalPages: 1 } : empty,
          ),
        );
      }),
    );
    show();
    await screen.findByText(/No qualifications yet/u);
    await fill();
    await userEvent.click(screen.getByRole('button', { name: 'Record qualification' }));
    expect(await screen.findByRole('alert')).toHaveFocus();
    expect(screen.getByLabelText('Qualification reference')).toHaveValue('KW-Q-000001');
    await userEvent.click(screen.getByRole('button', { name: 'Record qualification' }));
    expect(await screen.findByText(/Qualification KW-Q-000001 recorded/u)).toHaveFocus();
    expect(await screen.findByText('Valid through 2027-10-01.')).toBeInTheDocument();
    expect(screen.getByLabelText('Qualification reference')).toHaveValue('');
  });
  it('prevents duplicate submits while pending and preserves values on a forbidden write', async () => {
    let finish: ((value: Response) => void) | undefined;
    const fetchMock = vi.fn((_url: string, options: RequestInit) =>
      options.method === 'POST'
        ? new Promise<Response>((resolve) => {
            finish = resolve;
          })
        : Promise.resolve(Response.json(empty)),
    );
    vi.stubGlobal('fetch', fetchMock);
    show();
    await screen.findByText(/No qualifications yet/u);
    await fill();
    await userEvent.click(screen.getByRole('button', { name: 'Record qualification' }));
    expect(screen.getByRole('button', { name: 'Recording…' })).toBeDisabled();
    expect(
      fetchMock.mock.calls.filter(([, options]) => options.method === 'POST'),
    ).toHaveLength(1);
    finish?.(
      Response.json(
        { message: 'You do not have permission to perform this action.' },
        { status: 403 },
      ),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'You do not have permission',
    );
    expect(screen.getByLabelText('Qualification reference')).toHaveValue('KW-Q-000001');
  });
  it('shows Auditor the dated view without mutation or upload controls', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(Response.json({ ...empty, items: [qualification], total: 1 })),
    );
    const { container } = show(['crew:read']);
    expect(await screen.findByText('Valid through 2027-10-01.')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Record qualification' }),
    ).not.toBeInTheDocument();
    expect(container.querySelector('input[type=file]')).toBeNull();
    expect(screen.getByText(/do not certify legal/u)).toBeInTheDocument();
  });
  it('recovers a failed read and supports paginated empty results', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('offline'))
      .mockResolvedValueOnce(Response.json({ ...empty, total: 21, totalPages: 2 }))
      .mockResolvedValue(Response.json({ ...empty, page: 2, total: 21, totalPages: 2 }));
    vi.stubGlobal('fetch', fetchMock);
    show();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Qualifications could not load',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Next' }));
    expect(
      await screen.findByText(/No qualifications on this page/u),
    ).toBeInTheDocument();
    await waitFor(() => expect(fetchMock.mock.calls.at(-1)?.[0]).toContain('page=2'));
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
  });
  it.each([403, 404])(
    'explains a %s read without offering a misleading retry',
    async (status) => {
      vi.stubGlobal(
        'fetch',
        vi
          .fn()
          .mockResolvedValue(
            Response.json({ message: 'Unavailable profile.' }, { status }),
          ),
      );
      show();
      expect(await screen.findByRole('alert')).toHaveTextContent('Unavailable profile.');
      expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: 'Record qualification' }),
      ).not.toBeInTheDocument();
    },
  );
  it('does not request protected data when the role has no Crew permission', () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    show([]);
    expect(
      screen.getByText('Crew access is not available for this role.'),
    ).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
