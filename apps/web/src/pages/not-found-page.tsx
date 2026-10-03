import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <main className="system-page">
      <section className="system-panel">
        <p className="eyebrow">Route not found</p>
        <h1>This position is outside the current chart.</h1>
        <p>The address does not point to an implemented Keelwatch view.</p>
        <Link className="button button--primary" to="/app">
          Return to overview
        </Link>
      </section>
    </main>
  );
}
