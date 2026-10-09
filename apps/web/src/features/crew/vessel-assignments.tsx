import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AssignmentForm } from './assignment-form';
import { AssignmentCancellation } from './assignment-cancellation';
import { CrewPageControls } from './crew-page-controls';
import { useAssignments } from './use-assignments';

export function VesselAssignments({
  vesselId,
  canWrite,
  onSaved,
}: {
  readonly vesselId: string;
  readonly canWrite: boolean;
  readonly onSaved: () => void;
}) {
  const [params, setParams] = useSearchParams();
  const rawPage = Number(params.get('assignmentPage') ?? 1);
  const page =
    Number.isInteger(rawPage) && rawPage >= 1 && rawPage <= 10000 ? rawPage : 1;
  const history = useAssignments(vesselId, page);
  const [saved, setSaved] = useState(0);
  const [notice, setNotice] = useState('');
  const successRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (saved) successRef.current?.focus();
  }, [saved]);
  function refreshAfterSave(message = 'Plan saved.') {
    setNotice(message);
    setSaved((value) => value + 1);
    setParams((current) => {
      current.set('assignmentPage', '1');
      return current;
    });
    history.refresh();
    onSaved();
  }
  return (
    <section className="vessel-activity" aria-labelledby="assignment-heading">
      <p className="eyebrow">Crew / synthetic planning</p>
      <h2 id="assignment-heading">Assignment plans</h2>
      <p>
        Planning only, not confirmed boarding or fitness. Optional demo requirement
        evaluation is advisory and does not block planning.
      </p>
      <Link className="button button--secondary" to="/app/crew">
        Open crew profiles
      </Link>
      {saved ? (
        <div className="fleet-success" role="status" tabIndex={-1} ref={successRef}>
          {notice} If history or Activity fails to refresh, retry the read—not the
          confirmed write.
        </div>
      ) : null}
      {history.status === 'loading' ? (
        <p role="status">Loading assignment history…</p>
      ) : null}
      {history.status === 'error' ? (
        <div role="alert">
          <p>{history.message}</p>
          {history.correlationId ? <p>Reference: {history.correlationId}</p> : null}
          {history.httpStatus !== 403 &&
          history.httpStatus !== 401 &&
          history.httpStatus !== 404 ? (
            <button className="button button--secondary" onClick={history.refresh}>
              Retry history
            </button>
          ) : null}
        </div>
      ) : null}
      {history.status === 'success' ? (
        <>
          <p>
            As of {history.data.asOf} (UTC) · {history.data.total} plans
          </p>
          {history.data.items.length === 0 ? (
            <p>
              {page === 1
                ? 'No assignment plans yet.'
                : 'No plans on this page. Return to a previous page.'}
            </p>
          ) : (
            <dl className="crew-records">
              {history.data.items.map((plan) => (
                <div key={plan.id}>
                  <dt>
                    {plan.displayName} · {plan.crewNumber}
                  </dt>
                  <dd>
                    {plan.roleLabel}
                    <br />
                    {plan.startsOn} — {plan.endsOn}
                    <br />
                    <span className="status-pill">{plan.status}</span>
                    {plan.cancellation ? (
                      <p>
                        {plan.cancellation.reasonLabel} · {plan.cancellation.cancelledAt}{' '}
                        (UTC)
                      </p>
                    ) : null}
                    {canWrite && plan.status !== 'CANCELLED' ? (
                      <AssignmentCancellation
                        vesselId={vesselId}
                        plan={plan}
                        onSaved={() =>
                          refreshAfterSave(
                            'Plan cancelled. Original history retained; all dates are released.',
                          )
                        }
                      />
                    ) : null}
                  </dd>
                </div>
              ))}
            </dl>
          )}
          <CrewPageControls
            page={page}
            totalPages={history.data.totalPages}
            label="Assignment history pages"
            onPage={(next) =>
              setParams((current) => {
                current.set('assignmentPage', String(next));
                return current;
              })
            }
          />
        </>
      ) : null}
      {canWrite &&
      history.status === 'success' &&
      history.data.vessel.status === 'ACTIVE' ? (
        <AssignmentForm
          key={vesselId}
          vesselId={vesselId}
          onSaved={() => refreshAfterSave()}
        />
      ) : null}
      {!canWrite ? (
        <p>Read-only plans · an Operations Manager can create plans.</p>
      ) : null}
      {history.status === 'success' && history.data.vessel.status === 'ARCHIVED' ? (
        <p>Archived vessel · history remains readable; new plans are disabled.</p>
      ) : null}
    </section>
  );
}
