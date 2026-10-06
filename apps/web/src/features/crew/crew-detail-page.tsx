import { useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useAppShell } from '../../app/app-shell-context';
import { QualificationForm } from './qualification-form';
import { useQualifications } from './use-qualifications';

function CrewQualificationWorkspace({ crewMemberId }: { readonly crewMemberId: string }) {
  const { user } = useAppShell();
  const [params, setParams] = useSearchParams();
  const requestedPage = Number(params.get('page') ?? 1);
  const page =
    Number.isInteger(requestedPage) && requestedPage >= 1 && requestedPage <= 10000
      ? requestedPage
      : 1;
  const state = useQualifications(crewMemberId, page);
  const [saved, setSaved] = useState<string | null>(null);
  const successRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (saved) successRef.current?.focus();
  }, [saved]);
  return (
    <>
      <header className="page-heading page-heading--fleet">
        <div>
          <p className="eyebrow">Crew / qualification record</p>
          <h1>
            {state.status === 'success' ? state.data.member.displayName : 'Crew profile.'}
          </h1>
          {state.status === 'success' ? (
            <p className="page-heading__meta">
              {state.data.member.crewNumber} · Assessed {state.data.asOf} UTC
            </p>
          ) : null}
        </div>
        <Link className="button button--secondary" to="/app/crew">
          Return to Crew
        </Link>
      </header>
      {saved ? (
        <div className="fleet-success" role="status" tabIndex={-1} ref={successRef}>
          Qualification {saved} recorded. Its audit event was saved together.
        </div>
      ) : null}
      {state.status === 'loading' ? <p role="status">Loading qualifications…</p> : null}
      {state.status === 'error' ? (
        <section className="fleet-state" role="alert">
          <h2>
            {state.httpStatus === 404
              ? 'Crew profile not found.'
              : 'Qualifications unavailable.'}
          </h2>
          <p>{state.message}</p>
          {state.correlationId ? <p>Reference: {state.correlationId}</p> : null}
          {state.httpStatus !== 403 && state.httpStatus !== 404 ? (
            <button className="button button--secondary" onClick={state.retry}>
              Try again
            </button>
          ) : null}
        </section>
      ) : null}
      {state.status === 'success' ? (
        <>
          <section
            className="vessel-activity qualification-ledger"
            aria-labelledby="qualifications-heading"
          >
            <p className="eyebrow">Demo qualification ledger</p>
            <h2 id="qualifications-heading">Validity, explained.</h2>
            <p>
              These synthetic records do not certify legal, medical or operational
              fitness. No files are accepted.
            </p>
            <p>
              {state.data.total}{' '}
              {state.data.total === 1 ? 'qualification' : 'qualifications'} recorded.
            </p>
            {state.data.items.length === 0 ? (
              <p>
                {page === 1
                  ? 'No qualifications yet. An Operations Manager can record the first one.'
                  : 'No qualifications on this page. Return to the previous page.'}
              </p>
            ) : (
              <ul className="qualification-list">
                {state.data.items.map((item) => (
                  <li key={item.id}>
                    <h3>{item.kindLabel}</h3>
                    <p>
                      {item.referenceNumber} · {item.status.replaceAll('_', ' ')}
                    </p>
                    <p>{item.reason}</p>
                    <p>
                      Valid from {item.validFrom} · Expires on {item.expiresOn}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            {page > 1 || state.data.totalPages > 1 ? (
              <nav className="form-actions" aria-label="Qualification pages">
                <button
                  className="button button--secondary"
                  disabled={page === 1}
                  onClick={() => setParams({ page: String(page - 1) })}
                >
                  Previous
                </button>
                <span>
                  Page {page} of {Math.max(1, state.data.totalPages)}
                </span>
                <button
                  className="button button--secondary"
                  disabled={page >= state.data.totalPages}
                  onClick={() => setParams({ page: String(page + 1) })}
                >
                  Next
                </button>
              </nav>
            ) : null}
          </section>
          {user.permissions.includes('crew:write') ? (
            <section
              className="form-layout"
              aria-labelledby="record-qualification-heading"
            >
              <div className="form-layout__intro">
                <p className="eyebrow">New qualification</p>
                <h2 id="record-qualification-heading">Record demo validity</h2>
                <p>
                  Future dates remain not yet valid. Expiry within 30 days needs
                  attention; the expiry day is included. Renewals use a new reference to
                  preserve history.
                </p>
              </div>
              <QualificationForm
                crewMemberId={crewMemberId}
                onSaved={(reference) => {
                  setSaved(reference);
                  setParams({ page: '1' });
                  state.retry();
                }}
              />
            </section>
          ) : (
            <p className="page-heading__meta">
              Read-only qualifications · an Operations Manager can record qualifications.
            </p>
          )}
        </>
      ) : null}
    </>
  );
}

export function CrewDetailPage() {
  const { crewMemberId = '' } = useParams();
  const { user } = useAppShell();
  if (!user.permissions.includes('crew:read'))
    return (
      <section className="fleet-state">
        <h1>Crew access is not available for this role.</h1>
        <Link to="/app/vessels">Return to Fleet</Link>
      </section>
    );
  return <CrewQualificationWorkspace key={crewMemberId} crewMemberId={crewMemberId} />;
}
