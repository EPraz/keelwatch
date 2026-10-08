import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuthSession } from '../../auth/auth-context';
import { FleetApiError, getVessel } from './fleet.api';
import type { VesselDetail } from './fleet.types';

type VesselDetailLoadState =
  | { readonly status: 'loading' }
  | {
      readonly status: 'error';
      readonly error: string;
      readonly httpStatus?: number;
      readonly correlationId?: string;
    }
  | {
      readonly status: 'success';
      readonly vessel: VesselDetail;
      readonly refreshError?: string;
    };

type VesselDetailState = VesselDetailLoadState & {
  readonly retry: () => void;
  readonly refresh: () => void;
};

export function useVesselDetail(vesselId: string): VesselDetailState {
  const session = useAuthSession();
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<VesselDetailLoadState>({
    status: 'loading',
  });
  const preserveNextLoad = useRef(false);
  const retry = useCallback(() => setAttempt((current) => current + 1), []);
  const refresh = useCallback(() => {
    preserveNextLoad.current = true;
    setAttempt((current) => current + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const preserveLoad = preserveNextLoad.current;
    if (!preserveLoad) setState({ status: 'loading' });
    preserveNextLoad.current = false;

    void (async () => {
      try {
        const token = await session.getAccessToken();
        if (!token) throw new Error('Your session has ended. Sign in and try again.');
        const vessel = await getVessel(token, vesselId, controller.signal);
        if (!controller.signal.aborted) setState({ status: 'success', vessel });
      } catch (error) {
        if (controller.signal.aborted) return;
        if (
          preserveLoad &&
          (!(error instanceof FleetApiError) ||
            ![401, 403, 404].includes(error.httpStatus ?? 0))
        ) {
          const message =
            error instanceof Error ? error.message : 'Activity could not refresh.';
          const correlation =
            error instanceof FleetApiError ? error.body.correlationId : undefined;
          setState((current) =>
            current.status === 'success'
              ? {
                  ...current,
                  refreshError: `${message}${correlation ? ` Reference: ${correlation}` : ''}`,
                }
              : current,
          );
          return;
        }
        if (error instanceof FleetApiError) {
          setState({
            status: 'error',
            error: error.message,
            httpStatus: error.httpStatus,
            correlationId: error.body.correlationId,
          });
          return;
        }
        setState({
          status: 'error',
          error:
            error instanceof Error
              ? error.message
              : 'Keelwatch could not load this vessel.',
        });
      }
    })();

    return () => controller.abort();
  }, [attempt, session, vesselId]);

  return { ...state, retry, refresh };
}
