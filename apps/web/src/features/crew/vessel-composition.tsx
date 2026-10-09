import { useSearchParams } from 'react-router-dom';
import { CompositionFilters } from './composition-filters';
import { CompositionResults } from './composition-results';
import type { CompositionQuery } from './composition.api';
import { useComposition } from './use-composition';
import { validAssignmentDate } from './use-assignment-form';

export function VesselComposition({
  vesselId,
  refreshVersion,
}: {
  readonly vesselId: string;
  readonly refreshVersion: number;
}) {
  const [params, setParams] = useSearchParams();
  const date = params.get('compositionDate') ?? '';
  const role = params.get('compositionRole') ?? '';
  const rawPage = params.get('compositionPage') ?? '1';
  const page = Number(rawPage);
  const valid =
    (!date || validAssignmentDate(date)) &&
    ['', 'DEMO_DECK', 'DEMO_SUPPORT'].includes(role) &&
    /^\d+$/u.test(rawPage) &&
    Number.isInteger(page) &&
    page >= 1 &&
    page <= 10000;
  function apply(nextDate: string, nextRole: string) {
    setParams((current) => {
      const next = new URLSearchParams(current);
      if (nextDate) next.set('compositionDate', nextDate);
      else next.delete('compositionDate');
      if (nextRole) next.set('compositionRole', nextRole);
      else next.delete('compositionRole');
      next.delete('compositionPage');
      return next;
    });
  }
  function onPage(nextPage: number) {
    setParams((current) => {
      const next = new URLSearchParams(current);
      next.set('compositionPage', String(nextPage));
      return next;
    });
  }
  return (
    <section
      className="vessel-activity vessel-composition"
      aria-labelledby="composition-heading"
    >
      <p className="eyebrow">Crew / synthetic planning</p>
      <h2 id="composition-heading">Crew composition</h2>
      <p>
        Planning only, not confirmed boarding or fitness. Membership uses the selected
        day; requirement coverage evaluates each full saved plan with currently registered
        qualifications.
      </p>
      <CompositionFilters
        key={`${date}:${role}`}
        date={validAssignmentDate(date) ? date : ''}
        role={['DEMO_DECK', 'DEMO_SUPPORT'].includes(role) ? role : ''}
        onApply={apply}
      />
      <CompositionView
        key={`${vesselId}:${date}:${role}:${rawPage}`}
        vesselId={vesselId}
        query={{ date, role, page }}
        refreshVersion={refreshVersion}
        valid={valid}
        onPage={onPage}
      />
    </section>
  );
}

function CompositionView({
  vesselId,
  query,
  refreshVersion,
  valid,
  onPage,
}: {
  readonly vesselId: string;
  readonly query: CompositionQuery;
  readonly refreshVersion: number;
  readonly valid: boolean;
  readonly onPage: (page: number) => void;
}) {
  const state = useComposition(vesselId, query, refreshVersion, valid);
  if (!valid)
    return (
      <p role="alert">
        Invalid composition URL. Use a valid date, a listed function and a page between 1
        and 10000. Apply the filters to correct it.
      </p>
    );
  if (state.status === 'loading') return <p role="status">Loading crew composition…</p>;
  if (state.status === 'error')
    return (
      <div className="form-error" role="alert">
        <p>
          {state.error.status === 403 || state.error.status === 401
            ? 'Crew composition access unavailable.'
            : state.error.status === 404
              ? 'Vessel not found.'
              : state.error.status === 400
                ? 'Composition filters are invalid.'
                : 'Crew composition unavailable.'}{' '}
          {state.error.message}
        </p>
        {state.error.correlationId ? <p>Reference: {state.error.correlationId}</p> : null}
        {state.error.fieldErrors ? (
          <ul>
            {Object.entries(state.error.fieldErrors).map(([field, errors]) => (
              <li key={field}>
                {field}: {errors.join(' ')}
              </li>
            ))}
          </ul>
        ) : null}
        {![400, 401, 403, 404].includes(state.error.status) ? (
          <button
            className="button button--secondary"
            type="button"
            onClick={state.refresh}
          >
            Retry composition
          </button>
        ) : null}
      </div>
    );
  return (
    <>
      <div className="form-actions">
        <button
          className="button button--secondary"
          type="button"
          onClick={state.refresh}
        >
          Refresh composition
        </button>
      </div>
      <CompositionResults data={state.data} onPage={onPage} />
    </>
  );
}
