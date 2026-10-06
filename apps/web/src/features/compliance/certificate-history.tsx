import { CertificateHistoryItem } from './certificate-history-item';
import type {
  Certificate,
  CertificateType,
  ComplianceWorkspace,
} from './compliance.types';

export function CertificateHistory({
  vesselId,
  certificates,
  certificateTypes,
  canWrite,
  onChanged,
}: {
  readonly vesselId: string;
  readonly certificates: readonly Certificate[];
  readonly certificateTypes: readonly CertificateType[];
  readonly canWrite: boolean;
  readonly onChanged: (workspace: ComplianceWorkspace) => void;
}) {
  return (
    <section
      className="certificate-history"
      aria-labelledby="certificate-history-heading"
    >
      <div className="compliance-section-heading">
        <div>
          <p className="eyebrow">Evidence ledger</p>
          <h3 id="certificate-history-heading">Certificate history</h3>
        </div>
        <span>{certificates.length} recorded</span>
      </div>
      {certificates.length === 0 ? (
        <div className="certificate-history__empty">
          <strong>No certificate evidence yet.</strong>
          <p>The required type remains missing until a permitted role records it.</p>
        </div>
      ) : (
        <ol>
          {certificates.map((certificate) => (
            <CertificateHistoryItem
              key={certificate.id}
              vesselId={vesselId}
              certificate={certificate}
              certificateTypes={certificateTypes}
              canWrite={canWrite}
              onChanged={onChanged}
            />
          ))}
        </ol>
      )}
    </section>
  );
}
