import { Link } from 'react-router-dom';
import type { MaintenancePage } from './maintenance.types';

export function MaintenanceCreationRecovery({
  vesselId,
  page,
  pending,
  onPage,
  onAccept,
}: {
  vesselId: string;
  page: MaintenancePage;
  pending: boolean;
  onPage: (page: number) => void;
  onAccept: () => void;
}) {
  return (
    <section className="maintenance-review" aria-labelledby="creation-recovery-heading">
      <h3 id="creation-recovery-heading">Check existing orders</h3>
      <p>
        The creation may have succeeded. Open a matching order to verify it. Review the
        vessel list before choosing another attempt; another creation could duplicate the
        work.
      </p>
      <ul>
        {page.items.map((order) => (
          <li key={order.id}>
            <Link to={`/app/vessels/${vesselId}/maintenance/${order.id}`}>
              {order.title}
            </Link>{' '}
            · {order.createdAt} · {order.assignee?.displayName ?? 'Unassigned'} ·{' '}
            {order.targetDate ?? 'No target date'}
          </li>
        ))}
      </ul>
      {page.items.length === 0 ? <p>No orders on this page.</p> : null}
      <div className="assignment-history__actions">
        <button
          type="button"
          className="button button--secondary"
          disabled={pending || page.page <= 1}
          onClick={() => onPage(page.page - 1)}
        >
          Previous existing orders
        </button>
        <span>
          Page {page.page} of {Math.max(1, page.totalPages)}
        </span>
        <button
          type="button"
          className="button button--secondary"
          disabled={pending || page.page >= page.totalPages}
          onClick={() => onPage(page.page + 1)}
        >
          Next existing orders
        </button>
        <button
          type="button"
          className="button button--secondary"
          disabled={pending}
          onClick={onAccept}
        >
          I checked existing orders; allow another attempt
        </button>
      </div>
    </section>
  );
}
