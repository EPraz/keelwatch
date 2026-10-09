import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAppShell } from '../../app/app-shell-context';
import type { MaintenanceOrder } from './maintenance.types';
import { maintenancePath } from './maintenance.api';
import { useMaintenanceRead } from './use-maintenance-read';
import { MaintenanceFailure } from './maintenance-failure';
import { MaintenanceForm } from './maintenance-form';
import { maintenanceLabel } from './maintenance-options';

function MaintenanceDetail({
  vesselId,
  orderId,
  canWrite,
}: {
  vesselId: string;
  orderId: string;
  canWrite: boolean;
}) {
  const read = useMaintenanceRead<MaintenanceOrder>(
    `${maintenancePath(vesselId)}/${encodeURIComponent(orderId)}`,
  );
  const [notice, setNotice] = useState('');
  const noticeRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (notice) noticeRef.current?.focus();
  }, [notice]);
  return (
    <>
      <Link className="back-link" to={`/app/vessels/${vesselId}`}>
        Vessel workspace
      </Link>
      {notice ? (
        <div className="fleet-success" role="status" tabIndex={-1} ref={noticeRef}>
          <p>{notice}</p>
        </div>
      ) : null}
      {read.status === 'loading' ? (
        <p role="status">Loading maintenance order…</p>
      ) : read.status === 'error' ? (
        <MaintenanceFailure error={read.error} onRetry={read.refresh} />
      ) : (
        <>
          <header className="page-heading page-heading--fleet">
            <div>
              <p className="eyebrow">Fleet / vessel / maintenance order</p>
              <h1>{read.data.title}</h1>
              <p>
                {read.data.vesselName} · {read.data.vesselRegistryNumber}
              </p>
              <p>
                {maintenanceLabel(read.data.status)} · revision {read.data.revision}
              </p>
            </div>
          </header>
          <section className="vessel-facts" aria-labelledby="maintenance-record-heading">
            <h2 id="maintenance-record-heading">Current order</h2>
            <dl className="crew-records">
              <div>
                <dt>Category</dt>
                <dd>{maintenanceLabel(read.data.category)}</dd>
              </div>
              <div>
                <dt>Priority</dt>
                <dd>{maintenanceLabel(read.data.priority)}</dd>
              </div>
              <div>
                <dt>Responsible user</dt>
                <dd>{read.data.assignee?.displayName ?? 'Unassigned'}</dd>
              </div>
              <div>
                <dt>Target date</dt>
                <dd>{read.data.targetDate ?? 'No target date'}</dd>
              </div>
            </dl>
          </section>
          {canWrite && !['CLOSED', 'CANCELLED'].includes(read.data.status) ? (
            <MaintenanceForm
              key={read.data.id}
              vesselId={vesselId}
              initial={read.data}
              onSaved={() => {
                setNotice('Maintenance changes saved. The write is confirmed.');
                read.refresh();
              }}
            />
          ) : (
            <p>
              {canWrite
                ? 'This order is final; editing is unavailable.'
                : 'Read-only maintenance view.'}
            </p>
          )}
        </>
      )}
    </>
  );
}
export function MaintenanceDetailPage() {
  const { vesselId = '', orderId = '' } = useParams();
  const { user } = useAppShell();
  if (
    !user.permissions.includes('maintenance:read') ||
    !user.permissions.includes('fleet:read')
  )
    return <p role="alert">Maintenance access denied.</p>;
  return (
    <MaintenanceDetail
      key={`${user.id}:${vesselId}:${orderId}`}
      vesselId={vesselId}
      orderId={orderId}
      canWrite={user.permissions.includes('maintenance:write')}
    />
  );
}
