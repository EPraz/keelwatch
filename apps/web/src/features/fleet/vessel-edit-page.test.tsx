import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CurrentUser } from '../../access/current-user.types';
import { AuthSessionContext } from '../../auth/auth-context';
import { VesselEditPage } from './vessel-edit-page';

const vesselId = '10000000-0000-4000-8000-000000000001';
const manager: CurrentUser = {
  id: '00000000-0000-4000-8000-000000000001',
  displayName: 'Morgan Reed',
  email: 'morgan.reed@example.test',
  roles: ['OPERATIONS_MANAGER'],
  permissions: ['fleet:read', 'fleet:write'],
};
const auditor: CurrentUser = {
  ...manager,
  id: '00000000-0000-4000-8000-000000000002',
  displayName: 'Avery Chen',
  roles: ['AUDITOR'],
  permissions: ['fleet:read'],
};
const detail = {
  id: vesselId,
  name: 'MV Northwind',
  registryNumber: 'KW-000001',
  status: 'ACTIVE',
  createdAt: '2026-10-02T12:00:00.000Z',
  updatedAt: '2026-10-02T12:00:00.000Z',
  activity: [],
};

function renderEdit(user: CurrentUser) {
  function TestShell() {
    return <Outlet context={{ user }} />;
  }

  return render(
    <AuthSessionContext.Provider
      value={{
        status: 'authenticated',
        mode: 'local',
        signIn: () => Promise.resolve(),
        signOut: () => Promise.resolve(),
        getAccessToken: () => Promise.resolve('local.test-token'),
      }}
    >
      <MemoryRouter initialEntries={[`/app/vessels/${vesselId}/edit`]}>
        <Routes>
          <Route path="/app" element={<TestShell />}>
            <Route path="vessels/:vesselId/edit" element={<VesselEditPage />} />
            <Route path="vessels/:vesselId" element={<h1>Vessel destination</h1>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthSessionContext.Provider>,
  );
}

afterEach(() => vi.unstubAllGlobals());

describe('VesselEditPage', () => {
  it('preloads values, prevents duplicate submits, and returns to detail after save', async () => {
    let resolveUpdate: ((value: Response) => void) | undefined;
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json(detail))
      .mockReturnValueOnce(
        new Promise<Response>((resolve) => {
          resolveUpdate = resolve;
        }),
      );
    vi.stubGlobal('fetch', fetchMock);
    renderEdit(manager);

    const name = await screen.findByRole('textbox', { name: 'Vessel name' });
    expect(name).toHaveValue('MV Northwind');
    await userEvent.clear(name);
    await userEvent.type(name, 'MV Northwind Star');
    await userEvent.click(screen.getByRole('button', { name: 'Save vessel' }));
    expect(screen.getByRole('button', { name: 'Saving vessel…' })).toBeDisabled();
    resolveUpdate?.(
      Response.json({ ...detail, name: 'MV Northwind Star' }, { status: 200 }),
    );
    expect(
      await screen.findByRole('heading', { name: 'Vessel destination' }),
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('preserves edited values when the registry conflicts', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(Response.json(detail))
        .mockResolvedValueOnce(
          Response.json(
            {
              code: 'VESSEL_REGISTRY_NUMBER_CONFLICT',
              message: 'A vessel with this registry number already exists.',
              fieldErrors: { registryNumber: ['Use a unique registry number.'] },
            },
            { status: 409 },
          ),
        ),
    );
    renderEdit(manager);

    const registry = await screen.findByRole('textbox', { name: 'Registry number' });
    await userEvent.clear(registry);
    await userEvent.type(registry, 'kw-000002');
    await userEvent.click(screen.getByRole('button', { name: 'Save vessel' }));

    expect(
      await screen.findByText('A vessel with this registry number already exists.'),
    ).toBeInTheDocument();
    expect(registry).toHaveValue('KW-000002');
  });

  it('does not load or render an edit form for an Auditor', () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    renderEdit(auditor);

    expect(
      screen.getByRole('heading', { name: 'This role cannot edit vessels.' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('form')).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
