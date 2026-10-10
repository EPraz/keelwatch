import { Toast } from '../../app/toast';
import { RequirementEvaluationResult } from './requirement-evaluation-result';
import type { AssignmentInput } from './assignment.api';
import { useRequirementPreview } from './use-requirement-preview';

export function RequirementPreview({
  vesselId,
  input,
  enabled,
}: {
  readonly vesselId: string;
  readonly input: AssignmentInput;
  readonly enabled: boolean;
}) {
  const { state, evaluate } = useRequirementPreview(vesselId, input);
  const retryable =
    state.status !== 'error' || ![401, 403, 404].includes(state.error.status);
  return (
    <div className="requirement-preview">
      <p className="field-hint">
        Optional demo evaluation for the full planned period. Complete the profile,
        function and dates to evaluate. Results never approve boarding or prevent saving a
        valid plan.
      </p>
      {retryable ? (
        <button
          className="button button--secondary"
          type="button"
          disabled={!enabled || state.status === 'pending'}
          onClick={() => void evaluate()}
        >
          {state.status === 'pending'
            ? 'Evaluating…'
            : state.status === 'error'
              ? 'Retry evaluation'
              : 'Evaluate requirements'}
        </button>
      ) : null}
      {state.status === 'pending' ? (
        <p role="status">Evaluating demo requirements… You can still create the plan.</p>
      ) : null}
      {state.status === 'error' ? (
        <Toast role="alert">
          <p>Evaluation unavailable. {state.error.message}</p>
          {state.error.correlationId ? (
            <p>Reference: {state.error.correlationId}</p>
          ) : null}
          {state.error.fieldErrors ? (
            <ul>
              {Object.entries(state.error.fieldErrors).map(([field, errors]) => (
                <li key={field}>
                  {field}: {errors.join(' ')}
                </li>
              ))}
            </ul>
          ) : null}
        </Toast>
      ) : null}
      {state.status === 'success' ? (
        <div role="status">
          <RequirementEvaluationResult data={state.data} />
        </div>
      ) : null}
    </div>
  );
}
