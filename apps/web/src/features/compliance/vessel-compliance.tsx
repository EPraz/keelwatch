import { ReadFailure } from '../../app/read-failure';
import { Link } from 'react-router-dom';
import { CertificateForm } from './certificate-form';
import { CertificateHistory } from './certificate-history';
import type { ComplianceStatus, ComplianceWorkspace } from './compliance.types';
import { useComplianceWorkspace } from './use-compliance-workspace';

const STATUS_LABELS: Readonly<Record<ComplianceStatus, string>> = {
  MISSING: 'Evidence missing',
  EXPIRED: 'Expired',
  EXPIRING_SOON: 'Expiring soon',
  VALID: 'Valid',
};
export function VesselCompliance({
  vesselId,
  canWrite,
  onCertificateCreated,
}: {
  readonly vesselId: string;
  readonly canWrite: boolean;
  readonly onCertificateCreated: () => void;
}) {
  const state = useComplianceWorkspace(vesselId);
  if (state.status === 'loading') {
    return (
      <section
        className="compliance-workspace"
        aria-label="Loading compliance status"
        aria-busy="true"
        aria-live="polite"
      >
        <span className="visually-hidden">Loading compliance status…</span>
        <div className="compliance-summary" aria-hidden="true">
          <div className="compliance-summary__marker skeleton" />
          <div className="compliance-loading__summary">
            <div className="skeleton skeleton--short" />
            <div className="skeleton skeleton--row" />
            <div className="skeleton skeleton--short" />
          </div>
        </div>
        <div className="compliance-body" aria-hidden="true">
          <div className="certificate-entry compliance-loading__body">
            <div className="skeleton skeleton--row" />
            {canWrite
              ? Array.from({ length: 5 }, (_, index) => (
                  <div className="skeleton skeleton--row" key={index} />
                ))
              : null}
          </div>
          <div className="certificate-entry compliance-loading__body">
            <div className="skeleton skeleton--row" />
            <div className="skeleton skeleton--row" />
            <div className="skeleton skeleton--row" />
          </div>
        </div>
      </section>
    );
  }
  if (state.status === 'error') {
    const forbidden = state.httpStatus === 403;
    return (
      <ReadFailure aria-labelledby="compliance-failure-heading">
        <p className="eyebrow">
          {forbidden ? 'Access boundary' : 'Evidence unavailable'}
        </p>
        <h2 id="compliance-failure-heading">
          {forbidden ? 'Compliance access denied.' : 'Compliance could not load.'}
        </h2>
        <p>{state.error}</p>
        {state.correlationId ? (
          <p className="correlation">Reference: {state.correlationId}</p>
        ) : null}
        {forbidden ? (
          <Link className="button button--secondary" to="/app/vessels">
            Return to Fleet
          </Link>
        ) : (
          <button
            className="button button--secondary"
            type="button"
            onClick={state.retry}
          >
            Try again
          </button>
        )}
      </ReadFailure>
    );
  }

  const workspace = state.workspace;
  const replaceWorkspace = (next: ComplianceWorkspace) => {
    state.replace(next);
    onCertificateCreated();
  };
  return (
    <section className="compliance-workspace" aria-labelledby="compliance-heading">
      <div className="compliance-summary" data-status={workspace.status}>
        <div className="compliance-summary__marker" aria-hidden="true">
          {workspace.status === 'VALID' ? '✓' : '!'}
        </div>
        <div>
          <p className="eyebrow">Documentary compliance</p>
          <h2 id="compliance-heading">{STATUS_LABELS[workspace.status]}</h2>
          <p>{workspace.reason}</p>
          <p className="compliance-summary__date">
            Evaluated in UTC as of {workspace.asOf}
          </p>
        </div>
        <span className="compliance-status">{workspace.status.replace('_', ' ')}</span>
      </div>

      <p className="compliance-notice compliance-notice--demo">
        File uploads and downloads are disabled in this portfolio demo to prevent
        untrusted file sharing. Certificate records, dates and history remain available.
      </p>
      <div className="compliance-body">
        {canWrite ? (
          <section
            className="certificate-entry"
            aria-labelledby="certificate-entry-heading"
          >
            <p className="eyebrow">Add evidence</p>
            <h3 id="certificate-entry-heading">Record a certificate</h3>
            <p>Calendar dates and duplicate references are checked again by the API.</p>
            <CertificateForm
              vesselId={vesselId}
              certificateTypes={workspace.certificateTypes}
              onSaved={replaceWorkspace}
            />
          </section>
        ) : (
          <section
            className="certificate-entry certificate-entry--readonly"
            aria-labelledby="certificate-readonly-heading"
          >
            <p className="eyebrow">Read-only watch</p>
            <h3 id="certificate-readonly-heading">Evidence is visible, not editable.</h3>
            <p>
              Auditors can review the derived reason and full certificate history. The API
              denies certificate writes for this role.
            </p>
          </section>
        )}
        <CertificateHistory
          vesselId={vesselId}
          certificates={workspace.certificates}
          certificateTypes={workspace.certificateTypes}
          canWrite={canWrite}
          onChanged={replaceWorkspace}
        />
      </div>
    </section>
  );
}
