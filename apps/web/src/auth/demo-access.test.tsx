import { act, render, screen } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthRoot } from './auth-root';
import { useAuthSession } from './auth-context';
import { useCurrentUser } from '../access/use-current-user';
import { ProtectedRoute } from '../app/protected-route';
import { ToastProvider } from '../app/toast-provider';
import { SignInPage } from '../pages/sign-in-page';

const oidcSdk = vi.hoisted(() => ({
  isLoading: false,
  isAuthenticated: false,
  user: { access_token: 'synthetic-external-oidc-token' },
  signinRedirect: vi.fn(() => Promise.resolve()),
  signoutRedirect: vi.fn(() => Promise.resolve()),
}));
vi.mock('react-oidc-context', () => ({
  AuthProvider: ({ children }: PropsWithChildren) => <>{children}</>,
  useAuth: () => ({ ...oidcSdk }),
}));

function Workspace() {
  const session = useAuthSession();
  const profile = useCurrentUser();
  return (
    <>
      {profile.status === 'success' ? (
        <p>{profile.user.displayName}</p>
      ) : (
        <p>Loading profile</p>
      )}
      <button onClick={() => void session.signOut()}>Sign out</button>
    </>
  );
}

function requestUrl(input: string | URL | Request): string {
  return input instanceof Request ? input.url : input.toString();
}

function demoTree(initialRoute = '/sign-in') {
  return (
    <AuthRoot>
      <ToastProvider>
        <MemoryRouter initialEntries={[initialRoute]}>
          <Routes>
            <Route path="/sign-in" element={<SignInPage />} />
            <Route element={<ProtectedRoute />}>
              <Route path="/app/*" element={<Workspace />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    </AuthRoot>
  );
}

function renderDemo(initialRoute = '/sign-in') {
  return render(demoTree(initialRoute));
}

function configureOidc() {
  vi.stubEnv('VITE_AUTH_MODE', 'oidc');
  vi.stubEnv('VITE_OIDC_AUTHORITY', 'https://identity.example.test/');
  vi.stubEnv('VITE_OIDC_CLIENT_ID', 'synthetic-spa');
  vi.stubEnv('VITE_OIDC_AUDIENCE', 'https://api.keelwatch.example.test');
  vi.stubEnv('PROD', true);
}

function demoApi(
  sessionResponse?: () => Promise<Response>,
  availableRoles = ['auditor'],
) {
  const fetch = vi.fn((input: string | URL | Request) => {
    const url = requestUrl(input);
    if (url.endsWith('/access/demo'))
      return Promise.resolve(Response.json({ availableRoles }));
    if (url.endsWith('/access/demo/sessions'))
      return (
        sessionResponse?.() ??
        Promise.resolve(
          Response.json({
            accessToken: 'demo.synthetic-issued-session',
            expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
          }),
        )
      );
    if (url.endsWith('/access/me'))
      return Promise.resolve(
        Response.json({
          id: 'synthetic-auditor',
          displayName: 'Demo Auditor profile',
          roles: ['AUDITOR'],
          permissions: ['fleet:read'],
        }),
      );
    return Promise.reject(new Error('Unexpected synthetic request.'));
  });
  vi.stubGlobal('fetch', fetch);
  return fetch;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.useRealTimers();
  oidcSdk.isAuthenticated = false;
  vi.clearAllMocks();
});

describe('Demo Auditor sign-in and session journey', () => {
  it('expires a session, clears the protected view and requires a fresh explicit sign-in', async () => {
    configureOidc();
    vi.useFakeTimers({ toFake: ['Date'] });
    const fetch = demoApi();
    renderDemo('/app/vessels');
    await userEvent.click(await screen.findByRole('button', { name: /Demo Auditor/i }));
    expect(await screen.findByText('Demo Auditor profile')).toBeInTheDocument();
    act(() => {
      vi.setSystemTime(Date.now() + 3_600_000);
      window.dispatchEvent(new Event('focus'));
    });
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Your demo session expired.',
    );
    expect(screen.queryByText('Demo Auditor profile')).not.toBeInTheDocument();
    expect(
      fetch.mock.calls.filter(([input]) =>
        requestUrl(input).endsWith('/access/demo/sessions'),
      ),
    ).toHaveLength(1);
    await userEvent.click(await screen.findByRole('button', { name: /Demo Auditor/i }));
    expect(await screen.findByText('Demo Auditor profile')).toBeInTheDocument();
  });

  it('disables entry controls while issuance is pending and avoids duplicate requests', async () => {
    configureOidc();
    let complete!: (response: Response) => void;
    const fetch = demoApi(
      () =>
        new Promise<Response>((resolve) => {
          complete = resolve;
        }),
    );
    renderDemo();
    const button = await screen.findByRole('button', { name: /Demo Auditor/i });
    await userEvent.click(button);
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent('Opening…');
    expect(
      screen.getByRole('button', { name: 'Continue with identity provider' }),
    ).toBeDisabled();
    await userEvent.click(button);
    expect(
      fetch.mock.calls.filter(([input]) =>
        requestUrl(input).endsWith('/access/demo/sessions'),
      ),
    ).toHaveLength(1);
    await act(async () => {
      complete(
        Response.json({
          accessToken: 'demo.synthetic-issued-session',
          expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
        }),
      );
      await Promise.resolve();
    });
    expect(await screen.findByText('Demo Auditor profile')).toBeInTheDocument();
  });

  it('keeps normal identity-provider entry available when the demo is disabled', async () => {
    configureOidc();
    demoApi(undefined, []);
    renderDemo();
    expect(
      await screen.findByText('Demo access is currently unavailable.'),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Demo Auditor/i }),
    ).not.toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', { name: 'Continue with identity provider' }),
    );
    expect(oidcSdk.signinRedirect).toHaveBeenCalledWith({ state: { returnTo: '/app' } });
  });

  it('recovers from an availability failure and refuses a malformed issued session', async () => {
    configureOidc();
    let availabilityAttempts = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn((input: string | URL | Request) => {
        if (requestUrl(input).endsWith('/access/demo')) {
          availabilityAttempts += 1;
          return Promise.resolve(
            availabilityAttempts === 1
              ? Response.json({}, { status: 503 })
              : Response.json({ availableRoles: ['auditor'] }),
          );
        }
        return Promise.resolve(
          Response.json({ accessToken: 'local.auditor', expiresAt: 'invalid' }),
        );
      }),
    );
    renderDemo();
    await userEvent.click(await screen.findByRole('button', { name: 'Try again' }));
    await userEvent.click(await screen.findByRole('button', { name: /Demo Auditor/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Sign-in could not start.',
    );
    expect(screen.queryByText('Demo Auditor profile')).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Continue with identity provider' }),
    ).toBeEnabled();
  });

  it('requires sign-out when an external OIDC session appears beside an active demo session', async () => {
    configureOidc();
    demoApi();
    const view = renderDemo();
    await userEvent.click(await screen.findByRole('button', { name: /Demo Auditor/i }));
    expect(await screen.findByText('Demo Auditor profile')).toBeInTheDocument();
    oidcSdk.isAuthenticated = true;
    view.rerender(demoTree());
    expect(
      await screen.findByText(
        'Two accounts are present. Sign out before choosing an account.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText('Demo Auditor profile')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(oidcSdk.signoutRedirect).toHaveBeenCalledOnce();
    oidcSdk.isAuthenticated = false;
    view.rerender(demoTree());
    expect(await screen.findByRole('button', { name: /Demo Auditor/i })).toBeEnabled();
    expect(screen.queryByText('Demo Auditor profile')).not.toBeInTheDocument();
  });

  it('explains a session limit and lets the visitor retry without losing the role choice', async () => {
    vi.stubEnv('VITE_AUTH_MODE', 'local');
    vi.stubEnv('PROD', false);
    let attempts = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn((input: string | URL | Request) => {
        if (requestUrl(input).endsWith('/access/demo'))
          return Promise.resolve(Response.json({ availableRoles: ['auditor'] }));
        if (requestUrl(input).endsWith('/access/demo/sessions')) {
          attempts += 1;
          return Promise.resolve(
            attempts === 1
              ? Response.json(
                  {
                    code: 'DEMO_SESSION_LIMITED',
                    message: 'Demo sign-in is busy. Try again in 60 seconds.',
                  },
                  { status: 429 },
                )
              : Response.json({
                  accessToken: 'demo.synthetic-issued-session',
                  expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
                }),
          );
        }
        return Promise.resolve(
          Response.json({
            id: 'synthetic-auditor',
            displayName: 'Demo Auditor profile',
            roles: ['AUDITOR'],
            permissions: ['fleet:read'],
          }),
        );
      }),
    );
    renderDemo();
    await userEvent.click(await screen.findByRole('button', { name: /Demo Auditor/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Try again in 60 seconds.',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Try demo again' }));
    expect(await screen.findByText('Demo Auditor profile')).toBeInTheDocument();
  });
  it('opens an issued session, restores it after reload and removes its profile on logout', async () => {
    vi.stubEnv('VITE_AUTH_MODE', 'local');
    vi.stubEnv('PROD', false);
    vi.stubGlobal(
      'fetch',
      vi.fn((input: string | URL | Request, init?: RequestInit) => {
        const url = requestUrl(input);
        if (url.endsWith('/access/demo'))
          return Promise.resolve(Response.json({ availableRoles: ['auditor'] }));
        if (url.endsWith('/access/demo/sessions') && init?.method === 'POST')
          return Promise.resolve(
            Response.json({
              accessToken: 'demo.synthetic-issued-session',
              expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
            }),
          );
        if (url.endsWith('/access/me')) {
          const header = (init?.headers as Record<string, string>)?.Authorization;
          return Promise.resolve(
            header === 'Bearer demo.synthetic-issued-session'
              ? Response.json({
                  id: 'synthetic-auditor',
                  displayName: 'Demo Auditor profile',
                  roles: ['AUDITOR'],
                  permissions: ['fleet:read'],
                })
              : Response.json(
                  { code: 'INVALID_ACCESS_TOKEN', message: 'Invalid session.' },
                  { status: 401 },
                ),
          );
        }
        return Promise.reject(new Error('Unexpected synthetic request.'));
      }),
    );
    const first = renderDemo();
    await userEvent.click(await screen.findByRole('button', { name: /Demo Auditor/i }));
    expect(await screen.findByText('Demo Auditor profile')).toBeInTheDocument();

    first.unmount();
    renderDemo('/app');
    expect(await screen.findByText('Demo Auditor profile')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(await screen.findByRole('button', { name: /Demo Auditor/i })).toBeEnabled();
    expect(screen.queryByText('Demo Auditor profile')).not.toBeInTheDocument();
  });
});
