import { useSearchParams } from 'react-router-dom';
import { useAppShell } from '../../app/app-shell-context';
import { ComplianceQueueFilters } from './compliance-queue-filters';
import { ComplianceQueueList } from './compliance-queue-list';
import {
  ComplianceQueueEmpty,
  ComplianceQueueFailure,
  ComplianceQueueLoading,
} from './compliance-queue-states';
import { ComplianceQueueSummary } from './compliance-queue-summary';
import { NotificationWatch } from './notification-watch';
import type { ComplianceStatus } from './compliance.types';
import { useComplianceQueue } from './use-compliance-queue';

const STATUSES = new Set<ComplianceStatus>([
  'MISSING',
  'EXPIRED',
  'EXPIRING_SOON',
  'VALID',
]);

function requestedStatus(value: string | null): ComplianceStatus | undefined {
  return value && STATUSES.has(value as ComplianceStatus)
    ? (value as ComplianceStatus)
    : undefined;
}

export function ComplianceQueuePage() {
  const { user } = useAppShell();
  const [params, setParams] = useSearchParams();
  const requestedPage = Number(params.get('page') ?? '1');
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const status = requestedStatus(params.get('status'));
  const search = params.get('search')?.trim() || undefined;
  const queue = useComplianceQueue({ page, status, search });

  const updatePage = (nextPage: number) => {
    const next = new URLSearchParams(params);
    if (nextPage === 1) next.delete('page');
    else next.set('page', String(nextPage));
    setParams(next);
  };

  const applyFilters = (nextStatus?: ComplianceStatus, nextSearch?: string) => {
    const next = new URLSearchParams();
    if (nextStatus) next.set('status', nextStatus);
    if (nextSearch) next.set('search', nextSearch);
    setParams(next);
  };

  return (
    <>
      <header className="page-heading page-heading--compliance">
        <div>
          <p className="eyebrow">Compliance watch</p>
          <h1>Act before evidence becomes exposure.</h1>
        </div>
        <p className="page-heading__meta">
          {queue.status === 'success'
            ? `Assessed ${queue.page.asOf} UTC`
            : 'Derived live'}
        </p>
      </header>

      {queue.status === 'loading' ? <ComplianceQueueLoading /> : null}
      {queue.status === 'error' ? (
        <ComplianceQueueFailure
          error={queue.error}
          forbidden={queue.httpStatus === 403}
          onRetry={queue.retry}
        />
      ) : null}
      {queue.status === 'success' ? (
        <ComplianceQueueSummary counts={queue.page.counts} search={search} />
      ) : null}
      <NotificationWatch canRun={user.permissions.includes('fleet:write')} />
      {queue.status === 'success' ? (
        <>
          <ComplianceQueueFilters
            key={`${status ?? 'ALL'}:${search ?? ''}`}
            search={search}
            status={status}
            onApply={applyFilters}
          />

          {queue.page.items.length === 0 ? (
            <ComplianceQueueEmpty filtered={Boolean(status || search)} />
          ) : (
            <section
              aria-labelledby="compliance-results-heading"
              aria-busy={queue.refreshing ?? false}
            >
              <div className="fleet-results-heading">
                <div>
                  <p className="eyebrow">Documentary risk queue</p>
                  <h2 id="compliance-results-heading">
                    {queue.page.total}{' '}
                    {queue.page.total === 1 ? 'vessel matches' : 'vessels match'}
                  </h2>
                </div>
                <p>
                  {queue.refreshing ? <span role="status">Updating… · </span> : null}
                  Page {queue.page.page} of {queue.page.totalPages}
                </p>
              </div>
              <ComplianceQueueList items={queue.page.items} />
              {queue.page.totalPages > 1 ? (
                <nav className="pagination" aria-label="Compliance pages">
                  <button
                    className="button button--secondary"
                    disabled={queue.refreshing || queue.page.page === 1}
                    onClick={() => updatePage(queue.page.page - 1)}
                  >
                    Previous
                  </button>
                  <button
                    className="button button--secondary"
                    disabled={
                      queue.refreshing || queue.page.page === queue.page.totalPages
                    }
                    onClick={() => updatePage(queue.page.page + 1)}
                  >
                    Next
                  </button>
                </nav>
              ) : null}
            </section>
          )}
        </>
      ) : null}
    </>
  );
}
