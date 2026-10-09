import { useEffect, useRef, useState } from 'react';
import { useAuthSession } from '../../auth/auth-context';
import type { AssignmentInput } from './assignment.api';
import { CrewApiError } from './crew.api';
import { evaluateDraft } from './requirement-evaluation.api';
import type { RequirementEvaluation } from './requirement-evaluation.types';

type PreviewState =
  | { status: 'idle' }
  | { status: 'pending' }
  | { status: 'success'; data: RequirementEvaluation }
  | { status: 'error'; error: CrewApiError };

// The owning preview is keyed by vessel and exact draft inputs. A changed draft
// unmounts this instance immediately and aborts its independent read.
export function useRequirementPreview(vesselId: string, input: AssignmentInput) {
  const session = useAuthSession();
  const [state, setState] = useState<PreviewState>({ status: 'idle' });
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);
  async function evaluate() {
    if (request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setState({ status: 'pending' });
    try {
      const token = await session.getAccessToken();
      if (controller.signal.aborted) return;
      if (!token) throw new CrewApiError(401, 'Your session has ended. Sign in again.');
      const data = await evaluateDraft(token, vesselId, input, controller.signal);
      if (!controller.signal.aborted) setState({ status: 'success', data });
    } catch (failure) {
      if (!controller.signal.aborted)
        setState({
          status: 'error',
          error:
            failure instanceof CrewApiError
              ? failure
              : new CrewApiError(
                  0,
                  'The evaluation could not be loaded. Retry the read or continue planning.',
                ),
        });
    } finally {
      if (request.current === controller) request.current = null;
    }
  }
  return { state, evaluate };
}
