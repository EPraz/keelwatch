import { Toast } from '../../app/toast';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAppShell } from '../../app/app-shell-context';
import type { MaintenanceOrder } from './maintenance.types';
import { maintenancePath } from './maintenance.api';
import { useMaintenanceRead } from './use-maintenance-read';
import { MaintenanceFailure } from './maintenance-failure';
import { MaintenanceForm } from './maintenance-form';
import { MaintenanceLifecycle } from './maintenance-lifecycle';
import { maintenanceLabel } from './maintenance-options';
import { MaintenanceHistory } from './maintenance-history';

function MaintenanceDetail({
  vesselId,
  orderId,
  canWrite,
  canReadHistory,
}: {
  vesselId: string;
  orderId: string;
  canWrite: boolean;
  canReadHistory: boolean;
}) {
  const read = useMaintenanceRead<MaintenanceOrder>(
    `${maintenancePath(vesselId)}/${encodeURIComponent(orderId)}`,
  );
  const [notice, setNotice] = useState('');
  const [confirmed, setConfirmed] = useState<MaintenanceOrder>();
  const order = read.status === 'success' ? read.data : confirmed;
  const final = order?.status === 'CLOSED' || order?.status === 'CANCELLED';
  const locked = final || read.status !== 'success';
  return (
    <>
      <Link className="back-link" to={`/app/vessels/${vesselId}`}>
        Vessel workspace
      </Link>
      {notice ? (
        <Toast key={confirmed?.revision} role="status" tabIndex={-1}>
          <p>{notice}</p>
        </Toast>
      ) : null}
      {read.status === 'loading' ? (
        <p role="status">Loading maintenance order…</p>
      ) : read.status === 'error' ? (
        <MaintenanceFailure error={read.error} onRetry={read.refresh} />
      ) : null}
      {order ? (
        <div className="maintenance-detail">
          <header className="page-heading page-heading--fleet">
            <div>
              <p className="eyebrow">Fleet / vessel / maintenance order</p>
              <h1>{order.title}</h1>
              <p>
                {order.vesselName} · {order.vesselRegistryNumber}
              </p>
              <p>
                {maintenanceLabel(order.status)} · revision {order.revision}
              </p>
            </div>
          </header>
          <section className="vessel-facts" aria-labelledby="maintenance-record-heading">
            <h2 id="maintenance-record-heading">Current order</h2>
            <dl>
              <div>
                <dt>Category</dt>
                <dd>{maintenanceLabel(order.category)}</dd>
              </div>
              <div>
                <dt>Priority</dt>
                <dd>{maintenanceLabel(order.priority)}</dd>
              </div>
              <div>
                <dt>Responsible user</dt>
                <dd>{order.assignee?.displayName ?? 'Unassigned'}</dd>
              </div>
              <div>
                <dt>Target date</dt>
                <dd>{order.targetDate ?? 'No target date'}</dd>
              </div>
              {order.reasonCode ? (
                <div>
                  <dt>Current reason</dt>
                  <dd>{maintenanceLabel(order.reasonCode)}</dd>
                </div>
              ) : null}
            </dl>
          </section>
          {canWrite && (!final || confirmed) ? (
            <>
              <MaintenanceForm
                key={order.id}
                vesselId={vesselId}
                initial={order}
                locked={locked}
                final={final}
                onSaved={(saved) => {
                  setConfirmed({ ...order, ...saved });
                  setNotice('Maintenance changes saved. The write is confirmed.');
                  read.refresh();
                }}
              />
              <MaintenanceLifecycle
                key={`lifecycle:${order.id}`}
                vesselId={vesselId}
                initial={order}
                locked={locked}
                onSaved={(saved) => {
                  setConfirmed({ ...order, ...saved });
                  setNotice(
                    `Maintenance action saved. Current state: ${maintenanceLabel(saved.status)}.`,
                  );
                  read.refresh();
                }}
              />
            </>
          ) : (
            <p>
              {canWrite
                ? 'This order is final; editing is unavailable.'
                : 'Read-only maintenance view.'}
            </p>
          )}
          {canReadHistory ? (
            <MaintenanceHistory
              key={`history:${order.id}:${confirmed?.revision ?? 0}`}
              vesselId={vesselId}
              orderId={orderId}
            />
          ) : (
            <Toast role="alert">History access denied.</Toast>
          )}
        </div>
      ) : null}
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
    return <Toast role="alert">Maintenance access denied.</Toast>;
  return (
    <MaintenanceDetail
      key={`${user.id}:${vesselId}:${orderId}`}
      vesselId={vesselId}
      orderId={orderId}
      canWrite={user.permissions.includes('maintenance:write')}
      canReadHistory={user.permissions.includes('activity:read')}
    />
  );
}
