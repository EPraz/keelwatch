import { Link } from 'react-router-dom';
import type { ComplianceStatus } from './compliance.types';

const SUMMARIES: readonly {
  readonly status: ComplianceStatus;
  readonly label: string;
  readonly detail: string;
}[] = [
  { status: 'MISSING', label: 'Missing', detail: 'Evidence required' },
  { status: 'EXPIRED', label: 'Expired', detail: 'Renewal overdue' },
  { status: 'EXPIRING_SOON', label: 'Expiring soon', detail: 'Within 30 days' },
  { status: 'VALID', label: 'Valid', detail: 'No action due' },
];

export function ComplianceQueueSummary({
  counts,
  search,
}: {
  readonly counts: Readonly<Record<ComplianceStatus, number>>;
  readonly search?: string;
}) {
  return (
    <section className="compliance-queue-summary" aria-label="Compliance totals">
      {SUMMARIES.map((summary) => {
        const params = new URLSearchParams({ status: summary.status });
        if (search) params.set('search', search);
        return (
          <Link
            key={summary.status}
            to={`/app/compliance?${params.toString()}`}
            data-status={summary.status}
          >
            <span>{counts[summary.status]}</span>
            <strong>{summary.label}</strong>
            <small>{summary.detail}</small>
          </Link>
        );
      })}
    </section>
  );
}
