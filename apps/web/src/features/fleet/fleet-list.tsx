import { Link } from 'react-router-dom';
import type { Vessel } from './fleet.types';

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeZone: 'UTC',
});

function formattedDate(value: string): string {
  return dateFormatter.format(new Date(value));
}

export function FleetList({ vessels }: { readonly vessels: readonly Vessel[] }) {
  return (
    <div className="fleet-register">
      <div className="fleet-table-wrap">
        <table className="fleet-table">
          <caption className="visually-hidden">Registered synthetic vessels</caption>
          <thead>
            <tr>
              <th scope="col">Vessel</th>
              <th scope="col">Registry number</th>
              <th scope="col">Status</th>
              <th scope="col">Registered</th>
            </tr>
          </thead>
          <tbody>
            {vessels.map((vessel) => (
              <tr key={vessel.id}>
                <th scope="row">
                  <Link className="vessel-link" to={`/app/vessels/${vessel.id}`}>
                    {vessel.name}
                  </Link>
                </th>
                <td className="registry-number">{vessel.registryNumber}</td>
                <td>
                  <span className="status-pill">{vessel.status}</span>
                </td>
                <td>{formattedDate(vessel.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="fleet-cards" aria-label="Registered synthetic vessels">
        {vessels.map((vessel) => (
          <li key={vessel.id}>
            <div>
              <p className="eyebrow">{vessel.registryNumber}</p>
              <h2>
                <Link className="vessel-link" to={`/app/vessels/${vessel.id}`}>
                  {vessel.name}
                </Link>
              </h2>
            </div>
            <dl>
              <div>
                <dt>Status</dt>
                <dd>{vessel.status}</dd>
              </div>
              <div>
                <dt>Registered</dt>
                <dd>{formattedDate(vessel.createdAt)}</dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>
    </div>
  );
}
