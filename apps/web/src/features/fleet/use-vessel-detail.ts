import { useCallback, useEffect, useState } from 'react';
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
    };

type VesselDetailState = VesselDetailLoadState & { readonly retry: () => void };

export function useVesselDetail(vesselId: string): VesselDetailState {
  const session = useAuthSession();
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<VesselDetailLoadState>({
    status: 'loading',
  });
  const retry = useCallback(() => setAttempt((current) => current + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: 'loading' });

    void (async () => {
      try {
        const token = await session.getAccessToken();
        if (!token) throw new Error('Your session has ended. Sign in and try again.');
        const vessel = await getVessel(token, vesselId, controller.signal);
        setState({ status: 'success', vessel });
      } catch (error) {
        if (controller.signal.aborted) return;
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

  return { ...state, retry };
}
