import { Link } from 'react-router-dom';
import type { MaintenanceOrder } from './maintenance.types';
import { maintenanceLabel } from './maintenance-options';

export function MaintenanceList({
  vesselId,
  orders,
}: {
  vesselId: string;
  orders: readonly MaintenanceOrder[];
}) {
  const orderLink = (order: MaintenanceOrder) => (
    <Link className="vessel-link" to={`/app/vessels/${vesselId}/maintenance/${order.id}`}>
      {order.title}
    </Link>
  );
  return (
    <div className="fleet-register maintenance-register">
      <div className="fleet-table-wrap">
        <table className="fleet-table">
          <caption className="visually-hidden">
            Maintenance orders for this vessel
          </caption>
          <thead>
            <tr>
              <th scope="col">Order</th>
              <th scope="col">Status</th>
              <th scope="col">Priority</th>
              <th scope="col">Responsible user</th>
              <th scope="col">Target date</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id}>
                <th scope="row">
                  {orderLink(order)}
                  <span className="maintenance-category">
                    {maintenanceLabel(order.category)}
                  </span>
                </th>
                <td>
                  <span className="status-pill">{maintenanceLabel(order.status)}</span>
                </td>
                <td>{maintenanceLabel(order.priority)}</td>
                <td>{order.assignee?.displayName ?? 'Unassigned'}</td>
                <td>{order.targetDate ?? 'No target date'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="fleet-cards" aria-label="Maintenance orders for this vessel">
        {orders.map((order) => (
          <li key={order.id}>
            <div>
              <p className="eyebrow">{maintenanceLabel(order.category)}</p>
              <h3>{orderLink(order)}</h3>
            </div>
            <dl>
              <div>
                <dt>Status / priority</dt>
                <dd>
                  {maintenanceLabel(order.status)} · {maintenanceLabel(order.priority)}
                </dd>
              </div>
              <div>
                <dt>Responsible user</dt>
                <dd>{order.assignee?.displayName ?? 'Unassigned'}</dd>
              </div>
              <div>
                <dt>Target date</dt>
                <dd>{order.targetDate ?? 'No target date'}</dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>
    </div>
  );
}
