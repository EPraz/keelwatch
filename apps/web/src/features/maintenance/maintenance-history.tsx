import { useEffect, useRef, useState } from 'react';
import type { MaintenanceHistoryPage } from './maintenance.types';
import { maintenancePath } from './maintenance.api';
import { useMaintenanceRead } from './use-maintenance-read';
import { MaintenanceFailure } from './maintenance-failure';
import { MaintenanceHistoryItem } from './maintenance-history-item';

function MaintenanceHistoryPages({
  vesselId,
  orderId,
}: {
  vesselId: string;
  orderId: string;
}) {
  const [cursors, setCursors] = useState<(string | null)[]>([null]);
  const cursor = cursors.at(-1);
  const path = `${maintenancePath(vesselId)}/${encodeURIComponent(orderId)}/history${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`;
  const read = useMaintenanceRead<MaintenanceHistoryPage>(path);
  const heading = useRef<HTMLHeadingElement>(null);
  const focusAfterRead = useRef(false);
  useEffect(() => {
    if (read.status !== 'loading' && focusAfterRead.current) {
      heading.current?.focus();
      focusAfterRead.current = false;
    }
  }, [read.status, cursor]);
  return (
    <section
      className="vessel-activity maintenance-history"
      aria-labelledby="maintenance-history-heading"
      aria-busy={read.status === 'loading'}
    >
      <p className="eyebrow">Complete order ledger</p>
      <h2 id="maintenance-history-heading" tabIndex={-1} ref={heading}>
        Order history
      </h2>
      <p>Newest first · 20 events per page</p>
      {read.status === 'loading' ? (
        <p role="status">Loading order history…</p>
      ) : read.status === 'error' ? (
        <MaintenanceFailure
          history
          error={read.error}
          onRetry={() => {
            focusAfterRead.current = true;
            read.refresh();
          }}
        />
      ) : read.data.items.length === 0 ? (
        <p role="status">No recorded order history on this page.</p>
      ) : (
        <ol>
          {read.data.items.map((event) => (
            <MaintenanceHistoryItem key={event.id} event={event} />
          ))}
        </ol>
      )}
      <nav className="pagination" aria-label="Order history pages">
        <button
          type="button"
          className="button button--secondary"
          disabled={cursors.length === 1}
          onClick={() => {
            focusAfterRead.current = true;
            setCursors((current) => current.slice(0, -1));
          }}
        >
          Newer history
        </button>
        <span role="status">History page {cursors.length}</span>
        <button
          type="button"
          className="button button--secondary"
          disabled={read.status !== 'success' || !read.data.nextCursor}
          onClick={() => {
            if (read.status === 'success' && read.data.nextCursor) {
              focusAfterRead.current = true;
              setCursors((current) => [...current, read.data.nextCursor]);
            }
          }}
        >
          Older history
        </button>
      </nav>
    </section>
  );
}
export function MaintenanceHistory(props: { vesselId: string; orderId: string }) {
  return (
    <MaintenanceHistoryPages key={`${props.vesselId}:${props.orderId}`} {...props} />
  );
}
