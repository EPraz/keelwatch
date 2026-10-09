import { useState } from 'react';

import {
  maintenanceStatuses,
  maintenancePriorities,
  maintenanceLabel,
} from './maintenance-options';
export function MaintenanceFilters({
  status,
  priority,
  onApply,
}: {
  status: string;
  priority: string;
  onApply: (status: string, priority: string) => void;
}) {
  const [draft, setDraft] = useState({ status, priority });
  return (
    <form
      className="composition-filters"
      onSubmit={(event) => {
        event.preventDefault();
        onApply(draft.status, draft.priority);
      }}
    >
      <div className="form-field">
        <label htmlFor="maintenance-status">Maintenance status</label>
        <select
          id="maintenance-status"
          value={draft.status}
          onChange={(event) => setDraft({ ...draft, status: event.target.value })}
        >
          <option value="">All statuses</option>
          {maintenanceStatuses.map((value) => (
            <option key={value} value={value}>
              {maintenanceLabel(value)}
            </option>
          ))}
        </select>
      </div>
      <div className="form-field">
        <label htmlFor="maintenance-priority">Maintenance priority</label>
        <select
          id="maintenance-priority"
          value={draft.priority}
          onChange={(event) => setDraft({ ...draft, priority: event.target.value })}
        >
          <option value="">All priorities</option>
          {maintenancePriorities.map((value) => (
            <option key={value} value={value}>
              {maintenanceLabel(value)}
            </option>
          ))}
        </select>
      </div>
      <div className="composition-filters__actions">
        <button className="button button--secondary">Apply maintenance filters</button>
      </div>
    </form>
  );
}
