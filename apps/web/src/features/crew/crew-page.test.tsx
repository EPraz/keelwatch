import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthSessionContext } from '../../auth/auth-context';
import { CrewPage } from './crew-page';

const emptyPage = { items: [], total: 0, page: 1, totalPages: 0 };
const member = {
  id: 'demo-crew',
  displayName: 'Jordan Vale',
  crewNumber: 'KW-C-000001',
  createdAt: '2026-10-06T00:00:00Z',
};
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
function show(permissions = ['crew:read', 'crew:write']) {
  const user = {
    id: 'demo',
    displayName: 'Morgan Reed',
    email: 'demo@example.test',
    roles: ['OPERATIONS_MANAGER'],
    permissions,
  };
  function Shell() {
    return <Outlet context={{ user }} />;
  }
  return render(
    <AuthSessionContext.Provider
      value={{
        status: 'authenticated',
        mode: 'local',
        signIn: () => Promise.resolve(),
        signOut: () => Promise.resolve(),
        getAccessToken: () => Promise.resolve('local.operations-manager'),
      }}
    >
      <MemoryRouter initialEntries={['/app/crew']}>
        <Routes>
          <Route path="/app" element={<Shell />}>
            <Route path="crew" element={<CrewPage />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthSessionContext.Provider>,
  );
}
afterEach(() => vi.unstubAllGlobals());

describe('Crew profiles', () => {
  it('announces empty/loading and validates without submitting', async () => {
    const fetch = vi.fn().mockImplementation(() => Promise.resolve(json(emptyPage)));
    vi.stubGlobal('fetch', fetch);
    show();
    expect(screen.getByText('Loading crew profiles…')).toBeInTheDocument();
    expect(await screen.findByText(/No crew profiles yet/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Register profile' }));
    expect(screen.getByRole('alert')).toHaveFocus();
    expect(screen.getByLabelText('Crew number')).toHaveAttribute('aria-invalid', 'true');
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(
      (await axe.run(document.body, { rules: { 'color-contrast': { enabled: false } } }))
        .violations,
    ).toEqual([]);
  });

  it('keeps duplicate values, then registers and refreshes with visible confirmation', async () => {
    let created = false,
      attempts = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((_url: string, options: RequestInit) => {
        if (options.method === 'POST') {
          attempts += 1;
          if (attempts === 1)
            return Promise.resolve(
              json({ message: 'A crew profile already uses this crew number.' }, 409),
            );
          created = true;
          return Promise.resolve(json(member, 201));
        }
        return Promise.resolve(
          json(
            created
              ? { ...emptyPage, items: [member], total: 1, totalPages: 1 }
              : emptyPage,
          ),
        );
      }),
    );
    show();
    await userEvent.type(screen.getByLabelText('Display name'), member.displayName);
    await userEvent.type(screen.getByLabelText('Crew number'), member.crewNumber);
    await userEvent.click(screen.getByRole('button', { name: 'Register profile' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('already uses');
    expect(screen.getByLabelText('Display name')).toHaveValue(member.displayName);
    await userEvent.click(screen.getByRole('button', { name: 'Register profile' }));
    expect(await screen.findByText(member.displayName)).toBeInTheDocument();
    const confirmation = screen.getByText(/Profile KW-C-000001 registered/);
    expect(confirmation).toHaveFocus();
    expect(screen.getByLabelText('Display name')).toHaveValue('');
    expect(attempts).toBe(2);
  });

  it('keeps an Auditor read-only and rejects a role with only Fleet access', async () => {
    const fetch = vi.fn().mockImplementation(() => Promise.resolve(json(emptyPage)));
    vi.stubGlobal('fetch', fetch);
    const rendered = show(['crew:read']);
    expect(await screen.findByText(/Read-only registry/)).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Register profile' }),
    ).not.toBeInTheDocument();
    rendered.unmount();
    fetch.mockClear();
    show(['fleet:read']);
    expect(
      screen.getByText('Crew access is not available for this role.'),
    ).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('recovers from a list failure and follows server pagination', async () => {
    const fetch = vi
      .fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(
        json({ ...emptyPage, items: [member], total: 21, totalPages: 2 }),
      )
      .mockResolvedValueOnce(json({ ...emptyPage, page: 2, total: 21, totalPages: 2 }));
    vi.stubGlobal('fetch', fetch);
    show(['crew:read']);
    expect(await screen.findByRole('alert')).toHaveTextContent('could not be reached');
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await screen.findByText(member.displayName);
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(await screen.findByText(/No profiles on this page/)).toBeInTheDocument();
    expect(fetch.mock.calls.at(-1)?.[0]).toContain('page=2');
  });

  it('prevents repeated submission while pending and preserves values on network failure', async () => {
    let failSave: (error: Error) => void = () => {};
    const fetch = vi.fn().mockImplementation((_url: string, options: RequestInit) =>
      options.method === 'POST'
        ? new Promise((_resolve, reject) => {
            failSave = reject;
          })
        : Promise.resolve(json(emptyPage)),
    );
    vi.stubGlobal('fetch', fetch);
    show();
    await userEvent.type(screen.getByLabelText('Display name'), member.displayName);
    await userEvent.type(screen.getByLabelText('Crew number'), member.crewNumber);
    await userEvent.dblClick(screen.getByRole('button', { name: 'Register profile' }));
    expect(screen.getByRole('button', { name: 'Registering…' })).toBeDisabled();
    expect(
      fetch.mock.calls.filter((call) => (call[1] as RequestInit).method === 'POST'),
    ).toHaveLength(1);
    failSave(new Error('offline'));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveFocus());
    expect(screen.getByLabelText('Crew number')).toHaveValue(member.crewNumber);
  });
});
