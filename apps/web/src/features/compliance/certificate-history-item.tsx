import { Toast } from '../../app/toast';
import { useState } from 'react';
import { useAuthSession } from '../../auth/auth-context';
import { archiveCertificate, ComplianceApiError } from './compliance.api';
import { CertificateEditForm } from './certificate-edit-form';
import type {
  Certificate,
  CertificateType,
  ComplianceWorkspace,
} from './compliance.types';

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeZone: 'UTC',
});

function formatDate(value: string): string {
  return dateFormatter.format(new Date(`${value}T00:00:00.000Z`));
}

export function CertificateHistoryItem({
  vesselId,
  certificate,
  certificateTypes,
  canWrite,
  onChanged,
}: {
  readonly vesselId: string;
  readonly certificate: Certificate;
  readonly certificateTypes: readonly CertificateType[];
  readonly canWrite: boolean;
  readonly onChanged: (workspace: ComplianceWorkspace) => void;
}) {
  const session = useAuthSession();
  const [editing, setEditing] = useState(false);
  const [confirmingArchive, setConfirmingArchive] = useState(false);
  const [pendingArchive, setPendingArchive] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const archived = certificate.archivedAt !== null;

  const archive = async () => {
    setPendingArchive(true);
    setError(null);
    try {
      const token = await session.getAccessToken();
      if (!token) throw new Error('Your session has ended. Sign in and try again.');
      const workspace = await archiveCertificate(token, vesselId, certificate.id);
      setConfirmingArchive(false);
      setEditing(false);
      setNotice(
        'Certificate archived. It remains in history and no longer affects status.',
      );
      onChanged(workspace);
    } catch (archiveError) {
      setError(
        archiveError instanceof ComplianceApiError || archiveError instanceof Error
          ? archiveError.message
          : 'The certificate could not be archived.',
      );
    } finally {
      setPendingArchive(false);
    }
  };

  return (
    <li className={archived ? 'certificate-history__item--archived' : undefined}>
      <div className="certificate-history__record">
        <div>
          <span className="certificate-history__type">
            {certificate.certificateTypeName}
          </span>
          <strong>{certificate.referenceNumber}</strong>
          <span>{certificate.issuer}</span>
        </div>
        {archived ? <span className="certificate-history__state">Archived</span> : null}
      </div>
      <dl>
        <div>
          <dt>Issued</dt>
          <dd>{formatDate(certificate.issuedOn)}</dd>
        </div>
        <div>
          <dt>Expires</dt>
          <dd>{formatDate(certificate.expiresOn)}</dd>
        </div>
      </dl>

      {notice ? <Toast role="status">{notice}</Toast> : null}
      {error ? <Toast role="alert">{error}</Toast> : null}

      {canWrite && !archived && !editing ? (
        <div className="certificate-history__actions">
          <button
            className="button button--secondary"
            type="button"
            onClick={() => {
              setEditing(true);
              setConfirmingArchive(false);
              setNotice(null);
              setError(null);
            }}
          >
            Edit {certificate.referenceNumber}
          </button>
          <button
            className="button button--secondary"
            type="button"
            onClick={() => {
              setConfirmingArchive(true);
              setNotice(null);
              setError(null);
            }}
          >
            Archive {certificate.referenceNumber}
          </button>
        </div>
      ) : null}

      {confirmingArchive && !archived ? (
        <div
          className="certificate-history__confirm"
          role="group"
          aria-label="Archive certificate"
        >
          <p>
            Archive <strong>{certificate.referenceNumber}</strong>? It will remain in
            history but stop affecting the current status.
          </p>
          <div className="certificate-history__actions">
            <button
              className="button button--primary"
              type="button"
              disabled={pendingArchive}
              onClick={() => void archive()}
            >
              {pendingArchive ? 'Archiving…' : 'Confirm archive'}
            </button>
            <button
              className="button button--secondary"
              type="button"
              disabled={pendingArchive}
              onClick={() => setConfirmingArchive(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {editing && !archived ? (
        <CertificateEditForm
          vesselId={vesselId}
          certificate={certificate}
          certificateTypes={certificateTypes}
          onSaved={onChanged}
          onCancel={() => setEditing(false)}
        />
      ) : null}
    </li>
  );
}
