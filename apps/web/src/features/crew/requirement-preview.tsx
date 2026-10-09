import { Link } from 'react-router-dom';
import type { AssignmentInput } from './assignment.api';
import type { EvaluationStatus } from './requirement-evaluation.types';
import { useRequirementPreview } from './use-requirement-preview';

const labels: Record<EvaluationStatus, string> = {
  INCOMPLETE: 'Incomplete coverage',
  WARNING: 'Coverage with warning',
  COVERED: 'Coverage without warning',
};
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
    <div>
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
        <div className="form-error" role="alert">
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
        </div>
      ) : null}
      {state.status === 'success' ? (
        <div role="status">
          <p>
            <strong>{labels[state.data.status]}</strong>
          </p>
          <p>
            Evaluated plan: {state.data.startsOn} — {state.data.endsOn}. Consulted{' '}
            {state.data.consultedAt} (UTC), using currently registered qualifications.
          </p>
          <dl className="crew-records">
            {state.data.requirements.map((requirement) => (
              <div key={requirement.kind}>
                <dt>{requirement.kindLabel}</dt>
                <dd>
                  <span className="status-pill">{labels[requirement.status]}</span>
                  <p>{requirement.reason}</p>
                </dd>
              </div>
            ))}
          </dl>
          <Link to={`/app/crew/${encodeURIComponent(state.data.crewMemberId)}`}>
            View profile qualifications
          </Link>
        </div>
      ) : null}
    </div>
  );
}
