import { useEffect, useReducer } from 'react';
import { useAuthSession } from '../../auth/auth-context';
import { getAssignments, type AssignmentWorkspace } from './assignment.api';
import { CrewApiError } from './crew.api';

type State =
  | { status: 'loading' }
  | { status: 'success'; data: AssignmentWorkspace }
  | { status: 'error'; message: string; httpStatus?: number; correlationId?: string };
export function useAssignments(vesselId: string, page: number) {
  const session = useAuthSession();
  const [version, refresh] = useReducer((value: number) => value + 1, 0);
  const [state, dispatch] = useReducer((_state: State, next: State) => next, {
    status: 'loading',
  });
  useEffect(() => {
    const controller = new AbortController();
    dispatch({ status: 'loading' });
    void (async () => {
      try {
        const token = await session.getAccessToken();
        if (!token) throw new CrewApiError(401, 'Your session has ended. Sign in again.');
        if (controller.signal.aborted) return;
        const data = await getAssignments(token, vesselId, page, controller.signal);
        if (!controller.signal.aborted) dispatch({ status: 'success', data });
      } catch (error) {
        if (controller.signal.aborted) return;
        dispatch({
          status: 'error',
          message:
            error instanceof CrewApiError
              ? error.message
              : 'Assignment history could not be reached. Try again.',
          httpStatus: error instanceof CrewApiError ? error.status : undefined,
          correlationId: error instanceof CrewApiError ? error.correlationId : undefined,
        });
      }
    })();
    return () => controller.abort();
  }, [vesselId, page, version, session]);
  return { ...state, refresh };
}
