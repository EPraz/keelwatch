import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAppShell } from '../../app/app-shell-context';
import { CrewRegisterForm } from './crew-register-form';
import { useCrew } from './use-crew';

function CrewRegistry() {
  const { user } = useAppShell();
  const [params, setParams] = useSearchParams();
  const rawPage = Number(params.get('page') ?? 1);
  const page =
    Number.isInteger(rawPage) && rawPage >= 1 && rawPage <= 10000 ? rawPage : 1;
  const crew = useCrew(page);
  const [saved, setSaved] = useState<string | null>(null);
  const successRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (saved) successRef.current?.focus();
  }, [saved]);

  return (
    <>
      {saved ? (
        <div className="fleet-success" role="status" tabIndex={-1} ref={successRef}>
          Profile {saved} registered. No vessel assignment has been created.
        </div>
      ) : null}
      <section className="vessel-activity" aria-labelledby="crew-register-heading">
        <p className="eyebrow">Fleet-wide registry</p>
        <h2 id="crew-register-heading">People, before assignments.</h2>
        {crew.status === 'loading' ? <p role="status">Loading crew profiles…</p> : null}
        {crew.status === 'error' ? (
          <div role="alert">
            <p>{crew.message}</p>
            {crew.correlationId ? <p>Reference: {crew.correlationId}</p> : null}
            {crew.httpStatus !== 403 ? (
              <button className="button button--secondary" onClick={crew.retry}>
                Try again
              </button>
            ) : null}
          </div>
        ) : null}
        {crew.status === 'success' ? (
          <>
            <p>
              {crew.data.total} {crew.data.total === 1 ? 'profile' : 'profiles'} in the
              registry.
            </p>
            {crew.data.items.length === 0 ? (
              <p>
                {page === 1
                  ? 'No crew profiles yet. An Operations Manager can register the first synthetic profile.'
                  : 'No profiles on this page. Return to the previous page.'}
              </p>
            ) : (
              <dl className="crew-records">
                {crew.data.items.map((member) => (
                  <div key={member.id}>
                    <dt>{member.crewNumber}</dt>
                    <dd>
                      <Link to={`/app/crew/${member.id}`}>{member.displayName}</Link>
                    </dd>
                  </div>
                ))}
              </dl>
            )}
            {page > 1 || crew.data.totalPages > 1 ? (
              <nav className="form-actions" aria-label="Crew pages">
                <button
                  className="button button--secondary"
                  disabled={page === 1}
                  onClick={() => setParams({ page: String(page - 1) })}
                >
                  Previous
                </button>
                <span>
                  Page {page} of {Math.max(1, crew.data.totalPages)}
                </span>
                <button
                  className="button button--secondary"
                  disabled={page >= crew.data.totalPages}
                  onClick={() => setParams({ page: String(page + 1) })}
                >
                  Next
                </button>
              </nav>
            ) : null}
          </>
        ) : null}
      </section>
      {user.permissions.includes('crew:write') ? (
        <section className="form-layout" aria-labelledby="crew-create-heading">
          <div className="form-layout__intro">
            <p className="eyebrow">New profile</p>
            <h2 id="crew-create-heading">Establish a crew identity</h2>
            <p>
              Registration saves the profile and its audit event together. Qualifications
              and vessel assignments are not part of this record.
            </p>
          </div>
          <CrewRegisterForm
            onSaved={(member) => {
              setSaved(member.crewNumber);
              setParams({ page: '1' });
              crew.retry();
            }}
          />
        </section>
      ) : (
        <p className="page-heading__meta">
          Read-only registry · an Operations Manager can register profiles.
        </p>
      )}
    </>
  );
}

export function CrewPage() {
  const { user } = useAppShell();
  return (
    <>
      <header className="page-heading page-heading--fleet">
        <div>
          <p className="eyebrow">Fleet / crew registry</p>
          <h1>Crew profiles.</h1>
        </div>
        <Link className="button button--secondary" to="/app/vessels">
          Return to Fleet
        </Link>
      </header>
      {user.permissions.includes('crew:read') ? (
        <CrewRegistry />
      ) : (
        <section className="fleet-state" aria-labelledby="crew-denied-heading">
          <h2 id="crew-denied-heading">Crew access is not available for this role.</h2>
          <p>The API requires Crew read permission.</p>
        </section>
      )}
    </>
  );
}
