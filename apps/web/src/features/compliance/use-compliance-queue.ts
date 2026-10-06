import { useCallback, useEffect, useReducer } from 'react';
import { useAuthSession } from '../../auth/auth-context';
import { ComplianceApiError, listComplianceQueue } from './compliance.api';
import type {
  ComplianceApiErrorBody,
  ComplianceQueuePage,
  ComplianceStatus,
} from './compliance.types';

type ComplianceQueueState =
  | { readonly status: 'loading' }
  | { readonly status: 'success'; readonly page: ComplianceQueuePage }
  | {
      readonly status: 'error';
      readonly httpStatus?: number;
      readonly error: ComplianceApiErrorBody;
    };

export function useComplianceQueue(query: {
  readonly page: number;
  readonly pageSize?: number;
  readonly status?: ComplianceStatus;
  readonly search?: string;
}): ComplianceQueueState & { readonly retry: () => void } {
  const session = useAuthSession();
  const [requestVersion, retry] = useReducer((version: number) => version + 1, 0);
  const [state, dispatch] = useReducer(
    (_state: ComplianceQueueState, next: ComplianceQueueState) => next,
    { status: 'loading' },
  );

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      dispatch({ status: 'loading' });
      try {
        const accessToken = await session.getAccessToken();
        if (!accessToken) {
          throw new ComplianceApiError(401, {
            code: 'AUTHENTICATION_REQUIRED',
            message: 'Your session has ended. Sign in and try again.',
          });
        }
        dispatch({
          status: 'success',
          page: await listComplianceQueue(accessToken, controller.signal, query),
        });
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        if (error instanceof ComplianceApiError) {
          dispatch({ status: 'error', httpStatus: error.httpStatus, error: error.body });
          return;
        }
        dispatch({
          status: 'error',
          error: {
            code: 'NETWORK_ERROR',
            message:
              'The Compliance service could not be reached. Check the API and try again.',
          },
        });
      }
    }
    void load();
    return () => controller.abort();
  }, [query.page, query.pageSize, query.search, query.status, requestVersion, session]);

  return { ...state, retry: useCallback(() => retry(), []) };
}
