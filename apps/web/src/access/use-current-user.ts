import { useCallback, useEffect, useReducer } from 'react';
import { useAuthSession } from '../auth/auth-context';
import type {
  ApiErrorResponse,
  CurrentUser,
  CurrentUserState,
} from './current-user.types';

const apiRoot = (import.meta.env.VITE_API_URL || '/api/v1').replace(/\/$/u, '');

function isApiErrorResponse(value: unknown): value is ApiErrorResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    'code' in value &&
    typeof value.code === 'string' &&
    'message' in value &&
    typeof value.message === 'string'
  );
}

async function readError(response: Response): Promise<ApiErrorResponse> {
  const body: unknown = await response.json().catch(() => null);
  if (isApiErrorResponse(body)) return body;
  return {
    code: 'REQUEST_FAILED',
    message: 'Keelwatch could not load your access profile.',
    correlationId: response.headers.get('x-correlation-id') ?? undefined,
  };
}

export function useCurrentUser(): CurrentUserState & { readonly retry: () => void } {
  const session = useAuthSession();
  const [requestVersion, retry] = useReducer((version: number) => version + 1, 0);
  const [state, dispatch] = useReducer(
    (_state: CurrentUserState, next: CurrentUserState) => next,
    { status: 'loading' },
  );

  useEffect(() => {
    const controller = new AbortController();

    async function load(): Promise<void> {
      dispatch({ status: 'loading' });
      try {
        const accessToken = await session.getAccessToken();
        if (!accessToken) {
          dispatch({
            status: 'error',
            httpStatus: 401,
            error: {
              code: 'AUTHENTICATION_REQUIRED',
              message: 'Your session has ended.',
            },
          });
          return;
        }

        const response = await fetch(`${apiRoot}/access/me`, {
          headers: { Authorization: `Bearer ${accessToken}` },
          signal: controller.signal,
        });
        if (!response.ok) {
          dispatch({
            status: 'error',
            httpStatus: response.status,
            error: await readError(response),
          });
          return;
        }
        dispatch({ status: 'success', user: (await response.json()) as CurrentUser });
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        dispatch({
          status: 'error',
          error: {
            code: 'NETWORK_ERROR',
            message: 'The service could not be reached. Check the API and try again.',
          },
        });
      }
    }

    void load();
    return () => controller.abort();
  }, [requestVersion, session]);

  return { ...state, retry: useCallback(() => retry(), []) };
}
