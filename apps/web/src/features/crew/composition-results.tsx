import type { CrewComposition } from './composition.types';
import { RequirementEvaluationResult } from './requirement-evaluation-result';
import { CrewPageControls } from './crew-page-controls';

export function CompositionResults({
  data,
  onPage,
}: {
  readonly data: CrewComposition;
  readonly onPage: (page: number) => void;
}) {
  return (
    <>
      <p className="composition-context">
        Selected day: {data.date} (UTC) · {data.total} matching plans. Consulted{' '}
        {data.consultedAt} (UTC).
      </p>
      {data.vessel.status === 'ARCHIVED' ? (
        <p>Archived vessel · retained plans remain readable.</p>
      ) : null}
      {data.items.length === 0 ? (
        <p role="status">
          {data.page > 1
            ? 'No plans on this composition page. Return to page one.'
            : data.role
              ? 'No plans match this date and function.'
              : 'No assignment plans include this date.'}
        </p>
      ) : (
        <div className="composition-results">
          {data.items.map((plan) => (
            <article className="composition-plan" key={plan.assignmentId}>
              <header>
                <p className="eyebrow">{plan.roleLabel}</p>
                <h3>
                  {plan.displayName} · {plan.crewNumber}
                </h3>
                <p>
                  Full plan: {plan.startsOn} — {plan.endsOn}
                </p>
              </header>
              <RequirementEvaluationResult data={plan} />
            </article>
          ))}
        </div>
      )}
      {data.page > data.totalPages && data.page > 1 ? (
        <button
          className="button button--secondary"
          type="button"
          onClick={() => onPage(1)}
        >
          First composition page
        </button>
      ) : null}
      <CrewPageControls
        page={data.page}
        totalPages={data.totalPages}
        label="Crew composition pages"
        onPage={onPage}
      />
    </>
  );
}
