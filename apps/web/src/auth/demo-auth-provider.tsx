import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import { AuthSessionContext, useAuthSession } from './auth-context';
import type { AuthSession, DemoAccessState, SignInOptions } from './auth.types';
import { issueDemoSession, loadDemoRoles } from './demo.api';
import { readDemoSession, saveDemoSession } from './demo-session-storage';
import { rememberReturnTo } from '../app/return-to';

export function DemoAuthProvider({ children }: PropsWithChildren) {
  const normal = useAuthSession();
  const [demo, setDemo] = useState(readDemoSession);
  const [notice, setNotice] = useState<string>();
  const [version, setVersion] = useState(0);
  const [availability, setAvailability] = useState<Omit<DemoAccessState, 'reload'>>({
    status: 'loading',
    availableRoles: [],
  });
  const pending = useRef<AbortController | null>(null);
  const conflict = demo !== null && normal.status === 'authenticated';

  const reload = useCallback(() => {
    setAvailability({ status: 'loading', availableRoles: [] });
    setVersion((value) => value + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadDemoRoles(controller.signal).then(
      (roles) => {
        if (!controller.signal.aborted)
          setAvailability({ status: 'ready', availableRoles: roles });
      },
      () => {
        if (!controller.signal.aborted)
          setAvailability({ status: 'error', availableRoles: [] });
      },
    );
    return () => controller.abort();
  }, [version]);

  useEffect(() => () => pending.current?.abort(), []);

  const clearDemo = useCallback((message?: string) => {
    pending.current?.abort();
    pending.current = null;
    let cleanupNotice = message;
    try {
      saveDemoSession(null);
    } catch {
      cleanupNotice ??=
        'You are signed out here. Close this tab to clear its saved demo session.';
    }
    setDemo(null);
    setNotice(cleanupNotice);
  }, []);

  useEffect(() => {
    if (!demo) return;
    const expire = () => {
      if (Date.parse(demo.expiresAt) <= Date.now())
        clearDemo('Your demo session expired. Choose a demo account to continue.');
    };
    const timer = window.setTimeout(
      expire,
      Math.max(0, Date.parse(demo.expiresAt) - Date.now()),
    );
    window.addEventListener('focus', expire);
    document.addEventListener('visibilitychange', expire);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('focus', expire);
      document.removeEventListener('visibilitychange', expire);
    };
  }, [demo, clearDemo]);

  const signIn = useCallback(
    async (options: SignInOptions) => {
      if (demo || normal.status === 'authenticated')
        throw new Error('Sign out before choosing another account.');
      if (!options.demoRole) return normal.signIn(options);
      if (!['manager', 'auditor'].includes(options.demoRole) || pending.current)
        throw new Error('Demo sign-in is already in progress.');
      const controller = new AbortController();
      pending.current = controller;
      try {
        const issued = await issueDemoSession(options.demoRole, controller.signal);
        if (controller.signal.aborted) return;
        saveDemoSession(issued);
        rememberReturnTo(options.returnTo);
        setNotice(undefined);
        setDemo(issued);
      } finally {
        if (pending.current === controller) pending.current = null;
      }
    },
    [demo, normal],
  );

  const signOut = useCallback(async () => {
    clearDemo();
    if (!demo || normal.status === 'authenticated') await normal.signOut();
  }, [clearDemo, demo, normal]);

  const getAccessToken = useCallback(() => {
    if (conflict) return Promise.resolve(null);
    if (!demo) return normal.getAccessToken();
    if (Date.parse(demo.expiresAt) <= Date.now()) {
      clearDemo('Your demo session expired. Choose a demo account to continue.');
      return Promise.resolve(null);
    }
    return Promise.resolve(demo.accessToken);
  }, [conflict, demo, normal, clearDemo]);

  const session = useMemo<AuthSession>(
    () => ({
      status: conflict
        ? 'misconfigured'
        : demo
          ? normal.status === 'loading'
            ? 'loading'
            : 'authenticated'
          : normal.status,
      mode: demo ? 'demo' : normal.mode,
      message: conflict
        ? 'Two accounts are present. Sign out before choosing an account.'
        : (notice ?? normal.message),
      demoAccess: { ...availability, reload },
      signIn,
      signOut,
      getAccessToken,
    }),
    [
      conflict,
      demo,
      normal,
      notice,
      availability,
      reload,
      signIn,
      signOut,
      getAccessToken,
    ],
  );

  return (
    <AuthSessionContext.Provider value={session}>
      <Fragment key={demo ? 'demo' : 'normal'}>{children}</Fragment>
    </AuthSessionContext.Provider>
  );
}
