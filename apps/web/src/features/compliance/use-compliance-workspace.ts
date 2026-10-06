import { useCallback, useEffect, useState } from 'react';
import { useAuthSession } from '../../auth/auth-context';
import { ComplianceApiError, getComplianceWorkspace } from './compliance.api';
import type { ComplianceWorkspace } from './compliance.types';

type LoadState =
  | { readonly status: 'loading' }
  | {
      readonly status: 'error';
      readonly error: string;
      readonly httpStatus?: number;
      readonly correlationId?: string;
    }
  | { readonly status: 'success'; readonly workspace: ComplianceWorkspace };

type WorkspaceState = LoadState & {
  readonly retry: () => void;
  readonly replace: (workspace: ComplianceWorkspace) => void;
};

export function useComplianceWorkspace(vesselId: string): WorkspaceState {
  const session = useAuthSession();
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const retry = useCallback(() => setAttempt((current) => current + 1), []);
  const replace = useCallback(
    (workspace: ComplianceWorkspace) => setState({ status: 'success', workspace }),
    [],
  );

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: 'loading' });
    void (async () => {
      try {
        const token = await session.getAccessToken();
        if (!token) throw new Error('Your session has ended. Sign in and try again.');
        const workspace = await getComplianceWorkspace(
          token,
          vesselId,
          controller.signal,
        );
        setState({ status: 'success', workspace });
      } catch (error) {
        if (controller.signal.aborted) return;
        if (error instanceof ComplianceApiError) {
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
              : 'Keelwatch could not load compliance evidence.',
        });
      }
    })();
    return () => controller.abort();
  }, [attempt, session, vesselId]);

  return { ...state, retry, replace };
}
