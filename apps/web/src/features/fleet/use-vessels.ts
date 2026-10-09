import { useCallback, useEffect, useReducer, useRef } from 'react';
import { useAuthSession } from '../../auth/auth-context';
import { FleetApiError, listVessels } from './fleet.api';
import type { FleetApiErrorBody, VesselPage } from './fleet.types';

export type VesselListState =
  | { readonly status: 'loading'; readonly preserve?: boolean }
  | {
      readonly status: 'success';
      readonly page: VesselPage;
      readonly refreshing?: boolean;
    }
  | {
      readonly status: 'error';
      readonly httpStatus?: number;
      readonly error: FleetApiErrorBody;
    };

export function useVessels(page = 1): VesselListState & { readonly retry: () => void } {
  const session = useAuthSession();
  const previousSession = useRef(session);
  const [requestVersion, retry] = useReducer((version: number) => version + 1, 0);
  const [state, dispatch] = useReducer(
    (current: VesselListState, next: VesselListState): VesselListState =>
      next.status === 'loading' && next.preserve && current.status === 'success'
        ? { ...current, refreshing: true }
        : next,
    { status: 'loading' },
  );

  useEffect(() => {
    const controller = new AbortController();
    const preserve = previousSession.current === session;
    previousSession.current = session;

    async function load(): Promise<void> {
      dispatch({ status: 'loading', preserve });
      try {
        const accessToken = await session.getAccessToken();
        if (controller.signal.aborted) return;
        if (!accessToken) {
          throw new FleetApiError(401, {
            code: 'AUTHENTICATION_REQUIRED',
            message: 'Your session has ended. Sign in and try again.',
          });
        }
        const result = await listVessels(accessToken, controller.signal, page);
        if (!controller.signal.aborted) dispatch({ status: 'success', page: result });
      } catch (error) {
        if (controller.signal.aborted) return;
        if (error instanceof FleetApiError) {
          dispatch({
            status: 'error',
            httpStatus: error.httpStatus,
            error: error.body,
          });
          return;
        }
        dispatch({
          status: 'error',
          error: {
            code: 'NETWORK_ERROR',
            message:
              'The Fleet service could not be reached. Check the API and try again.',
          },
        });
      }
    }

    void load();
    return () => controller.abort();
  }, [page, requestVersion, session]);

  return { ...state, retry: useCallback(() => retry(), []) };
}
