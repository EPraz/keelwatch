import { useCallback, useEffect, useReducer, useRef } from 'react';
import { useAuthSession } from '../../auth/auth-context';
import { ComplianceApiError, listComplianceQueue } from './compliance.api';
import type {
  ComplianceApiErrorBody,
  ComplianceQueuePage,
  ComplianceStatus,
} from './compliance.types';

type ComplianceQueueState =
  | { readonly status: 'loading'; readonly preserve?: boolean }
  | {
      readonly status: 'success';
      readonly page: ComplianceQueuePage;
      readonly refreshing?: boolean;
    }
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
  const previousSession = useRef(session);
  const previousFilters = useRef({
    search: query.search,
    status: query.status,
    pageSize: query.pageSize,
  });
  const [requestVersion, retry] = useReducer((version: number) => version + 1, 0);
  const [state, dispatch] = useReducer(
    (current: ComplianceQueueState, next: ComplianceQueueState): ComplianceQueueState =>
      next.status === 'loading' && next.preserve && current.status === 'success'
        ? { ...current, refreshing: true }
        : next,
    { status: 'loading' },
  );

  useEffect(() => {
    const controller = new AbortController();
    const preserve =
      previousSession.current === session &&
      previousFilters.current.search === query.search &&
      previousFilters.current.status === query.status &&
      previousFilters.current.pageSize === query.pageSize;
    previousSession.current = session;
    previousFilters.current = {
      search: query.search,
      status: query.status,
      pageSize: query.pageSize,
    };
    async function load() {
      dispatch({ status: 'loading', preserve });
      try {
        const accessToken = await session.getAccessToken();
        if (controller.signal.aborted) return;
        if (!accessToken) {
          throw new ComplianceApiError(401, {
            code: 'AUTHENTICATION_REQUIRED',
            message: 'Your session has ended. Sign in and try again.',
          });
        }
        const result = await listComplianceQueue(accessToken, controller.signal, query);
        if (!controller.signal.aborted) dispatch({ status: 'success', page: result });
      } catch (error) {
        if (controller.signal.aborted) return;
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
