import { useState, type FormEvent } from 'react';
import type { ComplianceStatus } from './compliance.types';

export function ComplianceQueueFilters({
  search,
  status,
  onApply,
}: {
  readonly search?: string;
  readonly status?: ComplianceStatus;
  readonly onApply: (status?: ComplianceStatus, search?: string) => void;
}) {
  const [searchInput, setSearchInput] = useState(search ?? '');
  const [statusInput, setStatusInput] = useState<ComplianceStatus | ''>(status ?? '');

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onApply(statusInput || undefined, searchInput.trim() || undefined);
  };

  return (
    <form
      className="compliance-queue-filters"
      aria-label="Compliance filters"
      onSubmit={submit}
    >
      <div className="form-field">
        <label htmlFor="compliance-search">Search vessel</label>
        <input
          id="compliance-search"
          type="search"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Name or registry number"
        />
      </div>
      <div className="form-field">
        <label htmlFor="compliance-status-filter">Status</label>
        <select
          id="compliance-status-filter"
          value={statusInput}
          onChange={(event) =>
            setStatusInput(event.target.value as ComplianceStatus | '')
          }
        >
          <option value="">All statuses</option>
          <option value="MISSING">Missing</option>
          <option value="EXPIRED">Expired</option>
          <option value="EXPIRING_SOON">Expiring soon</option>
          <option value="VALID">Valid</option>
        </select>
      </div>
      <button className="button button--primary" type="submit">
        Apply filters
      </button>
    </form>
  );
}
