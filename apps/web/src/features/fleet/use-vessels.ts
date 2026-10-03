import { useCallback, useEffect, useReducer } from 'react';
import { useAuthSession } from '../../auth/auth-context';
import { FleetApiError, listVessels } from './fleet.api';
import type { FleetApiErrorBody, VesselPage } from './fleet.types';

export type VesselListState =
  | { readonly status: 'loading' }
  | { readonly status: 'success'; readonly page: VesselPage }
  | {
      readonly status: 'error';
      readonly httpStatus?: number;
      readonly error: FleetApiErrorBody;
    };

export function useVessels(page = 1): VesselListState & { readonly retry: () => void } {
  const session = useAuthSession();
  const [requestVersion, retry] = useReducer((version: number) => version + 1, 0);
  const [state, dispatch] = useReducer(
    (_state: VesselListState, next: VesselListState) => next,
    { status: 'loading' },
  );

  useEffect(() => {
    const controller = new AbortController();

    async function load(): Promise<void> {
      dispatch({ status: 'loading' });
      try {
        const accessToken = await session.getAccessToken();
        if (!accessToken) {
          throw new FleetApiError(401, {
            code: 'AUTHENTICATION_REQUIRED',
            message: 'Your session has ended. Sign in and try again.',
          });
        }
        dispatch({
          status: 'success',
          page: await listVessels(accessToken, controller.signal, page),
        });
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
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
