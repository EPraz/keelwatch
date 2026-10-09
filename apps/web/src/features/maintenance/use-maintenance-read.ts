import { useEffect, useReducer, useState } from 'react';
import { useAuthSession } from '../../auth/auth-context';
import { MaintenanceApiError, readMaintenance } from './maintenance.api';

export type MaintenanceReadState<T> =
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: MaintenanceApiError };
export function useMaintenanceRead<T>(path: string | null) {
  const session = useAuthSession();
  const [version, refresh] = useReducer((value: number) => value + 1, 0);
  const [result, setResult] = useState<{
    path: string | null;
    session: typeof session;
    version: number;
    state: MaintenanceReadState<T>;
  }>();
  useEffect(() => {
    if (!path) return;
    const controller = new AbortController();
    const publish = (state: MaintenanceReadState<T>) => {
      if (!controller.signal.aborted) setResult({ path, session, version, state });
    };
    void (async () => {
      try {
        const token = await session.getAccessToken();
        if (controller.signal.aborted) return;
        if (!token)
          throw new MaintenanceApiError(
            401,
            'SESSION_ENDED',
            'Sign in again to continue.',
          );
        publish({
          status: 'success',
          data: await readMaintenance<T>(token, path, controller.signal),
        });
      } catch (error) {
        publish({
          status: 'error',
          error:
            error instanceof MaintenanceApiError
              ? error
              : new MaintenanceApiError(
                  0,
                  'UNAVAILABLE',
                  'Maintenance could not be reached. Try again.',
                ),
        });
      }
    })();
    return () => controller.abort();
  }, [path, session, version]);
  const state: MaintenanceReadState<T> =
    result?.path === path && result?.session === session && result?.version === version
      ? result.state
      : { status: 'loading' };
  return { ...state, refresh };
}
