import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CurrentUser } from '../../access/current-user.types';
import { AuthSessionContext } from '../../auth/auth-context';
import { VesselCreatePage } from './vessel-create-page';

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

function renderCreatePage(user: CurrentUser) {
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
      <MemoryRouter initialEntries={['/app/vessels/new']}>
        <Routes>
          <Route path="/app" element={<TestShell />}>
            <Route path="vessels/new" element={<VesselCreatePage />} />
            <Route path="vessels" element={<h1>Fleet destination</h1>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthSessionContext.Provider>,
  );
}

afterEach(() => vi.unstubAllGlobals());

describe('VesselCreatePage', () => {
  it('shows field-level validation and keeps entered values', async () => {
    renderCreatePage(manager);
    const name = screen.getByRole('textbox', { name: 'Vessel name' });
    const registry = screen.getByRole('textbox', { name: 'Registry number' });
    await userEvent.type(name, 'A');
    await userEvent.type(registry, 'bad');
    await userEvent.click(screen.getByRole('button', { name: 'Register vessel' }));

    expect(
      await screen.findByText('Name must contain at least 2 characters.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Use the demo format KW-######.')).toBeInTheDocument();
    expect(name).toHaveValue('A');
    expect(registry).toHaveValue('BAD');
    const accessibility = await axe.run(document.body, {
      rules: { 'color-contrast': { enabled: false } },
    });
    expect(accessibility.violations).toEqual([]);
  });

  it('preserves the form and identifies a duplicate registry conflict', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            code: 'VESSEL_REGISTRY_NUMBER_CONFLICT',
            message: 'A vessel with this registry number already exists.',
            fieldErrors: { registryNumber: ['Use a unique registry number.'] },
            correlationId: 'duplicate-test',
          }),
          { status: 409, headers: { 'content-type': 'application/json' } },
        ),
      ),
    );
    renderCreatePage(manager);
    await userEvent.type(
      screen.getByRole('textbox', { name: 'Vessel name' }),
      'MV Northwind',
    );
    await userEvent.type(
      screen.getByRole('textbox', { name: 'Registry number' }),
      'kw-000001',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Register vessel' }));

    expect(
      await screen.findByText('A vessel with this registry number already exists.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Use a unique registry number.')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Registry number' })).toHaveValue(
      'KW-000001',
    );
  });

  it('prevents duplicate submits and moves to Fleet after success', async () => {
    let resolveResponse: ((value: Response) => void) | undefined;
    vi.stubGlobal(
      'fetch',
      vi.fn().mockReturnValue(
        new Promise<Response>((resolve) => {
          resolveResponse = resolve;
        }),
      ),
    );
    renderCreatePage(manager);
    await userEvent.type(
      screen.getByRole('textbox', { name: 'Vessel name' }),
      'MV Northwind',
    );
    await userEvent.type(
      screen.getByRole('textbox', { name: 'Registry number' }),
      'KW-000001',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Register vessel' }));

    expect(screen.getByRole('button', { name: 'Registering vessel…' })).toBeDisabled();
    resolveResponse?.(
      new Response(
        JSON.stringify({
          id: '10000000-0000-4000-8000-000000000001',
          name: 'MV Northwind',
          registryNumber: 'KW-000001',
          status: 'ACTIVE',
          createdAt: '2026-10-02T12:00:00.000Z',
        }),
        { status: 201, headers: { 'content-type': 'application/json' } },
      ),
    );
    expect(
      await screen.findByRole('heading', { name: 'Fleet destination' }),
    ).toBeInTheDocument();
  });

  it('renders a permission-aware read-only state for an Auditor', () => {
    renderCreatePage(auditor);
    expect(
      screen.getByRole('heading', { name: 'This role cannot register vessels.' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('form')).not.toBeInTheDocument();
  });
});
