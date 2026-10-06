import { Link } from 'react-router-dom';
import type { ComplianceQueueItem, ComplianceStatus } from './compliance.types';

const STATUS_LABELS: Readonly<Record<ComplianceStatus, string>> = {
  MISSING: 'Missing',
  EXPIRED: 'Expired',
  EXPIRING_SOON: 'Expiring soon',
  VALID: 'Valid',
};

function expiryLabel(item: ComplianceQueueItem): string {
  if (!item.nextExpiryOn) return 'No applicable evidence';
  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeZone: 'UTC',
  }).format(new Date(`${item.nextExpiryOn}T00:00:00.000Z`));
}

function Status({ status }: { readonly status: ComplianceStatus }) {
  return (
    <span className="compliance-status" data-status={status}>
      {STATUS_LABELS[status]}
    </span>
  );
}

export function ComplianceQueueList({
  items,
}: {
  readonly items: readonly ComplianceQueueItem[];
}) {
  return (
    <div className="compliance-queue-register">
      <div className="compliance-queue-table-wrap">
        <table className="compliance-queue-table">
          <thead>
            <tr>
              <th scope="col">Vessel</th>
              <th scope="col">Status</th>
              <th scope="col">Evidence</th>
              <th scope="col">Next expiry</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.vessel.id}>
                <th scope="row">
                  <Link className="vessel-link" to={`/app/vessels/${item.vessel.id}`}>
                    {item.vessel.name}
                  </Link>
                  <span className="queue-registry">{item.vessel.registryNumber}</span>
                </th>
                <td>
                  <Status status={item.status} />
                </td>
                <td>{item.reason}</td>
                <td>{expiryLabel(item)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="compliance-queue-cards">
        {items.map((item) => (
          <li key={item.vessel.id} data-status={item.status}>
            <div className="compliance-queue-card__heading">
              <div>
                <Link className="vessel-link" to={`/app/vessels/${item.vessel.id}`}>
                  {item.vessel.name}
                </Link>
                <span className="queue-registry">{item.vessel.registryNumber}</span>
              </div>
              <Status status={item.status} />
            </div>
            <p>{item.reason}</p>
            <p className="compliance-queue-card__expiry">{expiryLabel(item)}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
