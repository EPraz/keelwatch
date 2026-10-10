import { Toast } from '../../app/toast';
import { useSearchParams } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { maintenancePath } from './maintenance.api';
import type { MaintenancePage } from './maintenance.types';
import { useMaintenanceRead } from './use-maintenance-read';
import { maintenancePriorities, maintenanceStatuses } from './maintenance-options';
import { MaintenanceFilters } from './maintenance-filters';
import { MaintenanceFailure } from './maintenance-failure';
import { MaintenanceForm } from './maintenance-form';
import { MaintenanceList } from './maintenance-list';

export function VesselMaintenance({
  vesselId,
  vesselStatus,
  canWrite,
  onSaved,
}: {
  vesselId: string;
  vesselStatus: string;
  canWrite: boolean;
  onSaved: (message: string) => void;
}) {
  const [creating, setCreating] = useState(false);
  const [notice, setNotice] = useState('');
  const headingRef = useRef<HTMLHeadingElement>(null);
  const focusAfterRead = useRef(false);
  const [params, setParams] = useSearchParams();
  const status = params.get('maintenanceStatus') ?? '';
  const priority = params.get('maintenancePriority') ?? '';
  const page = Number(params.get('maintenancePage') ?? '1');
  const valid =
    (!status || maintenanceStatuses.includes(status)) &&
    (!priority || maintenancePriorities.includes(priority)) &&
    Number.isInteger(page) &&
    page >= 1 &&
    page <= 10000;
  const query = new URLSearchParams({ page: String(page) });
  if (status) query.set('status', status);
  if (priority) query.set('priority', priority);
  const read = useMaintenanceRead<MaintenancePage>(
    valid ? `${maintenancePath(vesselId)}?${query}` : null,
  );
  useEffect(() => {
    if (read.status !== 'loading' && focusAfterRead.current) {
      headingRef.current?.focus();
      focusAfterRead.current = false;
    }
  }, [read.status, page]);
  const changePage = (nextPage: number) => {
    focusAfterRead.current = true;
    const next = new URLSearchParams(params);
    next.set('maintenancePage', String(nextPage));
    setParams(next);
  };
  return (
    <section
      className="vessel-activity assignment-plans maintenance-workspace"
      aria-labelledby="maintenance-heading"
    >
      <p className="eyebrow">Vessel maintenance</p>
      <h2 id="maintenance-heading" ref={headingRef} tabIndex={-1}>
        Maintenance orders
      </h2>
      <p>
        Track this vessel’s work, responsible users and progress. Open an order to review
        its complete history.
      </p>
      {notice ? (
        <Toast role="status" tabIndex={-1}>
          <p>{notice}</p>
        </Toast>
      ) : null}
      {canWrite && vesselStatus === 'ACTIVE' ? (
        <button
          className="button button--primary"
          onClick={() => {
            setNotice('');
            setCreating(!creating);
          }}
        >
          {creating ? 'Close new order form' : 'New maintenance order'}
        </button>
      ) : canWrite ? (
        <p>Archived vessels retain existing orders; new orders cannot be created.</p>
      ) : (
        <p>Read-only maintenance view.</p>
      )}
      {creating && canWrite && vesselStatus === 'ACTIVE' ? (
        <MaintenanceForm
          vesselId={vesselId}
          onSaved={(order) => {
            const message = `Maintenance order saved. ${order.title} is Open.`;
            setNotice(message);
            setCreating(false);
            const next = new URLSearchParams(params);
            next.delete('maintenancePage');
            setParams(next);
            read.refresh();
            onSaved(message);
          }}
        />
      ) : null}
      <MaintenanceFilters
        key={`${status}:${priority}`}
        status={valid ? status : ''}
        priority={valid ? priority : ''}
        onRefresh={valid && read.status === 'success' ? read.refresh : undefined}
        onReset={() => {
          const next = new URLSearchParams(params);
          next.delete('maintenanceStatus');
          next.delete('maintenancePriority');
          next.delete('maintenancePage');
          setParams(next);
        }}
        onApply={(nextStatus, nextPriority) => {
          const next = new URLSearchParams(params);
          next.delete('maintenancePage');
          if (nextStatus) next.set('maintenanceStatus', nextStatus);
          else next.delete('maintenanceStatus');
          if (nextPriority) next.set('maintenancePriority', nextPriority);
          else next.delete('maintenancePriority');
          setParams(next);
        }}
      />
      {!valid ? (
        <Toast role="alert">
          Invalid maintenance URL. Apply valid filters to continue.
        </Toast>
      ) : read.status === 'loading' ? (
        <p role="status">Loading maintenance orders…</p>
      ) : read.status === 'error' ? (
        <MaintenanceFailure error={read.error} onRetry={read.refresh} />
      ) : (
        <>
          {read.data.items.length === 0 ? (
            <p>
              {page > 1
                ? 'No orders on this page. Return to page one.'
                : status || priority
                  ? 'No maintenance orders match these filters.'
                  : 'No maintenance orders yet.'}
            </p>
          ) : (
            <MaintenanceList vesselId={vesselId} orders={read.data.items} />
          )}
          <nav className="pagination" aria-label="Maintenance pages">
            {page > 1 ? (
              <button className="button button--secondary" onClick={() => changePage(1)}>
                First maintenance page
              </button>
            ) : null}
            <button
              className="button button--secondary"
              disabled={page <= 1}
              onClick={() => changePage(page - 1)}
            >
              Previous
            </button>
            <span>
              Page {page} of {Math.max(1, read.data.totalPages)}
            </span>
            <button
              className="button button--secondary"
              disabled={page >= read.data.totalPages}
              onClick={() => changePage(page + 1)}
            >
              Next
            </button>
          </nav>
        </>
      )}
    </section>
  );
}
