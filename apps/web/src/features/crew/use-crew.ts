import { useEffect, useReducer } from 'react';
import { useAuthSession } from '../../auth/auth-context';
import { CrewApiError, listCrew, type CrewPage } from './crew.api';

type CrewState =
  | { status: 'loading' }
  | { status: 'success'; data: CrewPage }
  | { status: 'error'; message: string; httpStatus?: number; correlationId?: string };

export function useCrew(page: number) {
  const session = useAuthSession();
  const [version, retry] = useReducer((value: number) => value + 1, 0);
  const [state, dispatch] = useReducer((_state: CrewState, next: CrewState) => next, {
    status: 'loading',
  });
  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      dispatch({ status: 'loading' });
      try {
        const token = await session.getAccessToken();
        if (!token) throw new CrewApiError(401, 'Your session has ended. Sign in again.');
        if (controller.signal.aborted) return;
        const data = await listCrew(token, page, controller.signal);
        if (!controller.signal.aborted) dispatch({ status: 'success', data });
      } catch (error) {
        if (controller.signal.aborted) return;
        dispatch({
          status: 'error',
          message:
            error instanceof CrewApiError
              ? error.message
              : 'The Crew service could not be reached. Try again.',
          httpStatus: error instanceof CrewApiError ? error.status : undefined,
          correlationId: error instanceof CrewApiError ? error.correlationId : undefined,
        });
      }
    };
    void load();
    return () => controller.abort();
  }, [page, version, session]);
  return { ...state, retry };
}
