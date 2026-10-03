import { useEffect, useRef } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { useAppShell } from '../../app/app-shell-context';
import { FleetList } from './fleet-list';
import { FleetEmpty, FleetFailure, FleetLoading } from './fleet-states';
import { useVessels } from './use-vessels';

function createdRegistryFromState(state: unknown): string | null {
  if (
    typeof state === 'object' &&
    state !== null &&
    'createdRegistryNumber' in state &&
    typeof state.createdRegistryNumber === 'string'
  ) {
    return state.createdRegistryNumber;
  }
  return null;
}

export function FleetPage() {
  const { user } = useAppShell();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedPage = Number(searchParams.get('page') ?? '1');
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const vessels = useVessels(page);
  const successRef = useRef<HTMLDivElement>(null);
  const createdRegistryNumber = createdRegistryFromState(location.state);
  const canCreate = user.permissions.includes('fleet:write');

  useEffect(() => {
    if (createdRegistryNumber) successRef.current?.focus();
  }, [createdRegistryNumber]);

  const changePage = (nextPage: number) => {
    const next = new URLSearchParams(searchParams);
    if (nextPage === 1) next.delete('page');
    else next.set('page', String(nextPage));
    setSearchParams(next);
  };

  return (
    <>
      <header className="page-heading page-heading--fleet">
        <div>
          <p className="eyebrow">Fleet register</p>
          <h1>Every vessel, accounted for.</h1>
        </div>
        {canCreate ? (
          <Link className="button button--primary" to="/app/vessels/new">
            Register vessel
          </Link>
        ) : (
          <p className="page-heading__meta">Read-only watch</p>
        )}
      </header>

      {createdRegistryNumber ? (
        <div className="fleet-success" role="status" tabIndex={-1} ref={successRef}>
          <span aria-hidden="true">✓</span>
          <p>
            <strong>Vessel registered.</strong> {createdRegistryNumber} is now on watch.
          </p>
        </div>
      ) : null}

      {vessels.status === 'loading' ? <FleetLoading /> : null}
      {vessels.status === 'error' ? (
        <FleetFailure
          error={vessels.error}
          forbidden={vessels.httpStatus === 403}
          onRetry={vessels.retry}
        />
      ) : null}
      {vessels.status === 'success' && vessels.page.items.length === 0 ? (
        <FleetEmpty canCreate={canCreate} />
      ) : null}
      {vessels.status === 'success' && vessels.page.items.length > 0 ? (
        <section aria-labelledby="fleet-results-heading">
          <div className="fleet-results-heading">
            <div>
              <p className="eyebrow">Active registry</p>
              <h2 id="fleet-results-heading">
                {vessels.page.total} {vessels.page.total === 1 ? 'vessel' : 'vessels'} on
                watch
              </h2>
            </div>
            <p>
              Page {vessels.page.page} of {vessels.page.totalPages}
            </p>
          </div>
          <FleetList vessels={vessels.page.items} />
          {vessels.page.totalPages > 1 ? (
            <nav className="pagination" aria-label="Fleet pages">
              <button
                className="button button--secondary"
                disabled={vessels.page.page === 1}
                onClick={() => changePage(vessels.page.page - 1)}
              >
                Previous
              </button>
              <button
                className="button button--secondary"
                disabled={vessels.page.page === vessels.page.totalPages}
                onClick={() => changePage(vessels.page.page + 1)}
              >
                Next
              </button>
            </nav>
          ) : null}
        </section>
      ) : null}
    </>
  );
}
