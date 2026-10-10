import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { LocalAuthProvider } from '../auth/local-auth-provider';
import { AuthSessionContext } from '../auth/auth-context';
import { SignInPage } from './sign-in-page';

describe('SignInPage', () => {
  it('reports a failed sign-in attempt and makes the action available again', async () => {
    render(
      <AuthSessionContext.Provider
        value={{
          status: 'unauthenticated',
          mode: 'oidc',
          getAccessToken: () => Promise.resolve(null),
          signIn: () => Promise.reject(new Error('Synthetic provider failure')),
          signOut: () => Promise.resolve(),
        }}
      >
        <MemoryRouter>
          <SignInPage />
        </MemoryRouter>
      </AuthSessionContext.Provider>,
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Continue with identity provider' }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Sign-in could not start.',
    );
    expect(
      screen.getByRole('button', { name: 'Continue with identity provider' }),
    ).toBeEnabled();
  });
  it('opens the requested protected route with a selected synthetic identity', async () => {
    const user = userEvent.setup();
    render(
      <LocalAuthProvider>
        <MemoryRouter
          initialEntries={[
            { pathname: '/sign-in', state: { returnTo: '/app?tab=overview' } },
          ]}
        >
          <Routes>
            <Route path="/sign-in" element={<SignInPage />} />
            <Route path="/app" element={<p>Protected workspace</p>} />
          </Routes>
        </MemoryRouter>
      </LocalAuthProvider>,
    );

    await user.click(screen.getByRole('button', { name: /Operations Manager/i }));

    expect(await screen.findByText('Protected workspace')).toBeInTheDocument();
    expect(sessionStorage.getItem('keelwatch.local-access-token')).toBe(
      'local.operations-manager',
    );
  });
});
