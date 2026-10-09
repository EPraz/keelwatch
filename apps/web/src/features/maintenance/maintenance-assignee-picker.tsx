import { useState } from 'react';
import { maintenancePath } from './maintenance.api';
import type { MaintenanceAssigneePage, MaintenanceOrder } from './maintenance.types';
import { useMaintenanceRead } from './use-maintenance-read';
import { MaintenanceFailure } from './maintenance-failure';

export function MaintenanceAssigneePicker({
  vesselId,
  value,
  retained,
  onChange,
}: {
  vesselId: string;
  value: string | null;
  retained?: MaintenanceOrder['assignee'];
  onChange: (id: string | null) => void;
}) {
  const [page, setPage] = useState(1);
  const read = useMaintenanceRead<MaintenanceAssigneePage>(
    `${maintenancePath(vesselId)}/assignees?page=${page}`,
  );
  return (
    <fieldset className="form-field">
      <legend>Responsible user (optional)</legend>
      <label>
        <input
          type="radio"
          name="maintenance-assignee"
          checked={value === null}
          onChange={() => onChange(null)}
        />{' '}
        No responsible user
      </label>
      {retained &&
      (read.status !== 'success' ||
        !read.data.items.some((item) => item.id === retained.id)) ? (
        <label>
          <input
            type="radio"
            name="maintenance-assignee"
            checked={value === retained.id}
            onChange={() => onChange(retained.id)}
          />{' '}
          {retained.displayName} (retained assignment)
        </label>
      ) : null}
      {read.status === 'loading' ? (
        <p role="status">Loading eligible users…</p>
      ) : read.status === 'error' ? (
        <MaintenanceFailure error={read.error} onRetry={read.refresh} />
      ) : (
        <>
          {read.data.items.length === 0 ? (
            <p>No eligible users on this page.</p>
          ) : (
            read.data.items.map((item) => (
              <label key={item.id}>
                <input
                  type="radio"
                  name="maintenance-assignee"
                  checked={value === item.id}
                  onChange={() => onChange(item.id)}
                />{' '}
                {item.displayName}
              </label>
            ))
          )}
          <div className="assignment-history__actions">
            <button
              type="button"
              className="button button--secondary"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              Previous users
            </button>
            <span>
              Users page {page} of {Math.max(1, read.data.totalPages)}
            </span>
            <button
              type="button"
              className="button button--secondary"
              disabled={page >= read.data.totalPages}
              onClick={() => setPage(page + 1)}
            >
              Next users
            </button>
          </div>
        </>
      )}
    </fieldset>
  );
}
