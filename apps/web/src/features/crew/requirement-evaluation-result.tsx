import { Link } from 'react-router-dom';
import type {
  EvaluationStatus,
  RequirementEvaluation,
} from './requirement-evaluation.types';

const labels: Record<EvaluationStatus, string> = {
  INCOMPLETE: 'Incomplete coverage',
  WARNING: 'Coverage with warning',
  COVERED: 'Coverage without warning',
};

export function RequirementEvaluationResult({
  data,
}: {
  readonly data: RequirementEvaluation;
}) {
  return (
    <div className="requirement-result">
      <div
        className={`requirement-summary requirement-tone--${data.status.toLowerCase()}`}
      >
        <span className="requirement-summary__icon" aria-hidden="true">
          {data.status === 'COVERED' ? '✓' : '!'}
        </span>
        <div>
          <p>
            <strong>{labels[data.status]}</strong>
          </p>
          <p className="requirement-summary__hint">
            Advisory only. A valid plan can still be saved.
          </p>
        </div>
      </div>
      <p className="requirement-context">
        Evaluated plan: {data.startsOn} — {data.endsOn}. Consulted {data.consultedAt}{' '}
        (UTC), using currently registered qualifications.
      </p>
      <dl className="crew-records">
        {data.requirements.map((requirement) => (
          <div
            className={`requirement-tone--${requirement.status.toLowerCase()}`}
            key={requirement.kind}
          >
            <dt>{requirement.kindLabel}</dt>
            <dd>
              <span className="status-pill requirement-status">
                {labels[requirement.status]}
              </span>
              <p>{requirement.reason}</p>
            </dd>
          </div>
        ))}
      </dl>
      <Link
        className="requirement-profile-link"
        to={`/app/crew/${encodeURIComponent(data.crewMemberId)}`}
      >
        View profile qualifications
      </Link>
    </div>
  );
}
