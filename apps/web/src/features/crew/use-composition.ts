import { useEffect, useReducer } from 'react';
import { useAuthSession } from '../../auth/auth-context';
import { CrewApiError } from './crew.api';
import { getComposition, type CompositionQuery } from './composition.api';
import type { CrewComposition } from './composition.types';

type State =
  | { status: 'loading' }
  | { status: 'success'; data: CrewComposition }
  | { status: 'error'; error: CrewApiError };
type ScopedState = { readonly scope: string; readonly result: State };
export function useComposition(
  vesselId: string,
  query: CompositionQuery,
  refreshVersion: number,
  valid: boolean,
) {
  const session = useAuthSession();
  const [version, refresh] = useReducer((value: number) => value + 1, 0);
  const { date, role, page } = query;
  const scope = `${vesselId}:${date}:${role}:${page}`;
  const [state, dispatch] = useReducer((_state: ScopedState, next: ScopedState) => next, {
    scope,
    result: { status: 'loading' },
  });
  useEffect(() => {
    if (!valid) return;
    const controller = new AbortController();
    dispatch({ scope, result: { status: 'loading' } });
    void (async () => {
      try {
        const token = await session.getAccessToken();
        if (controller.signal.aborted) return;
        if (!token) throw new CrewApiError(401, 'Your session has ended. Sign in again.');
        const data = await getComposition(
          token,
          vesselId,
          { date, role, page },
          controller.signal,
        );
        if (!controller.signal.aborted)
          dispatch({ scope, result: { status: 'success', data } });
      } catch (error) {
        if (!controller.signal.aborted)
          dispatch({
            scope,
            result: {
              status: 'error',
              error:
                error instanceof CrewApiError
                  ? error
                  : new CrewApiError(
                      0,
                      'Crew composition could not be reached. Try again.',
                    ),
            },
          });
      }
    })();
    return () => controller.abort();
  }, [vesselId, date, role, page, refreshVersion, version, session, valid, scope]);
  return {
    ...(state.scope === scope ? state.result : { status: 'loading' as const }),
    refresh,
  };
}
