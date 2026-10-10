import { Toast } from '../../app/toast';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AssignmentForm } from './assignment-form';
import { AssignmentCancellation } from './assignment-cancellation';
import { CrewPageControls } from './crew-page-controls';
import { useAssignments } from './use-assignments';
import { VesselComposition } from './vessel-composition';

export function VesselAssignments({
  vesselId,
  canWrite,
  onSaved,
}: {
  readonly vesselId: string;
  readonly canWrite: boolean;
  readonly onSaved: (message: string) => void;
}) {
  const [params, setParams] = useSearchParams();
  const rawPage = Number(params.get('assignmentPage') ?? 1);
  const page =
    Number.isInteger(rawPage) && rawPage >= 1 && rawPage <= 10000 ? rawPage : 1;
  const history = useAssignments(vesselId, page);
  const [saved, setSaved] = useState(0);
  const [notice, setNotice] = useState('');
  function refreshAfterSave(message = 'Plan saved.') {
    setNotice(message);
    setSaved((value) => value + 1);
    setParams((current) => {
      current.set('assignmentPage', '1');
      return current;
    });
    history.refresh();
    onSaved(message);
  }
  return (
    <>
      <VesselComposition vesselId={vesselId} refreshVersion={saved} />
      <section
        className="vessel-activity assignment-plans"
        aria-labelledby="assignment-heading"
      >
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
          <Toast key={saved} role="status" tabIndex={-1}>
            {notice} If composition, history or Activity fails to refresh, retry the
            read—not the confirmed write.
          </Toast>
        ) : null}
        {history.status === 'loading' ? (
          <p role="status">Loading assignment history…</p>
        ) : null}
        {history.status === 'error' ? (
          <Toast role="alert">
            <p>{history.message}</p>
            {history.correlationId ? <p>Reference: {history.correlationId}</p> : null}
            {history.httpStatus !== 403 &&
            history.httpStatus !== 401 &&
            history.httpStatus !== 404 ? (
              <button className="button button--secondary" onClick={history.refresh}>
                Retry history
              </button>
            ) : null}
          </Toast>
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
              <dl className="crew-records assignment-history">
                {history.data.items.map((plan) => (
                  <div key={plan.id}>
                    <dt>
                      {plan.displayName} · {plan.crewNumber}
                    </dt>
                    <dd>
                      <span>{plan.roleLabel}</span>
                      <span>
                        {plan.startsOn} — {plan.endsOn}
                      </span>
                      <div className="assignment-history__actions">
                        <span className="status-pill">{plan.status}</span>
                        {plan.cancellation ? (
                          <p>
                            {plan.cancellation.reasonLabel} ·{' '}
                            {plan.cancellation.cancelledAt} (UTC)
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
                      </div>
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
    </>
  );
}
