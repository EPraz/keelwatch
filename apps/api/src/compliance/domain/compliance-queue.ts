import type { VesselRecord } from '../../fleet/domain/vessel';
import {
  deriveComplianceSnapshot,
  formatCalendarDate,
  type CertificateRecord,
  type CertificateTypeRecord,
  type ComplianceStatus,
} from './certificate';

export interface ComplianceQueueQuery {
  readonly page: number;
  readonly pageSize: number;
  readonly status?: ComplianceStatus;
  readonly search?: string;
}

export interface ComplianceQueueItem {
  readonly vessel: Pick<VesselRecord, 'id' | 'name' | 'registryNumber'>;
  readonly status: ComplianceStatus;
  readonly reason: string;
  readonly nextExpiryOn: string | null;
}

export interface ComplianceQueuePage {
  readonly asOf: string;
  readonly items: readonly ComplianceQueueItem[];
  readonly counts: Readonly<Record<ComplianceStatus, number>>;
  readonly totalVessels: number;
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
  readonly totalPages: number;
}

const STATUS_ORDER: Readonly<Record<ComplianceStatus, number>> = {
  MISSING: 0,
  EXPIRED: 1,
  EXPIRING_SOON: 2,
  VALID: 3,
};

function currentExpiry(snapshot: ReturnType<typeof deriveComplianceSnapshot>) {
  const expiry = snapshot.requirements
    .flatMap((requirement) =>
      requirement.certificate ? [requirement.certificate.expiresOn] : [],
    )
    .sort((left, right) => left.getTime() - right.getTime())[0];
  return expiry ? formatCalendarDate(expiry) : null;
}

export function deriveComplianceQueue(input: {
  readonly vessels: readonly VesselRecord[];
  readonly certificateTypes: readonly CertificateTypeRecord[];
  readonly certificates: readonly CertificateRecord[];
  readonly asOf: Date;
  readonly query: ComplianceQueueQuery;
}): ComplianceQueuePage {
  const allItems = input.vessels.map((vessel) => {
    const snapshot = deriveComplianceSnapshot({
      certificateTypes: input.certificateTypes,
      certificates: input.certificates.filter((item) => item.vesselId === vessel.id),
      asOf: input.asOf,
    });
    return {
      vessel: {
        id: vessel.id,
        name: vessel.name,
        registryNumber: vessel.registryNumber,
      },
      status: snapshot.status,
      reason: snapshot.reason,
      nextExpiryOn: currentExpiry(snapshot),
    };
  });
  const counts = allItems.reduce<Record<ComplianceStatus, number>>(
    (result, item) => ({ ...result, [item.status]: result[item.status] + 1 }),
    { MISSING: 0, EXPIRED: 0, EXPIRING_SOON: 0, VALID: 0 },
  );
  const search = input.query.search?.trim().toLocaleLowerCase() ?? '';
  const filtered = allItems
    .filter((item) => !input.query.status || item.status === input.query.status)
    .filter(
      (item) =>
        !search ||
        item.vessel.name.toLocaleLowerCase().includes(search) ||
        item.vessel.registryNumber.toLocaleLowerCase().includes(search),
    )
    .sort(
      (left, right) =>
        STATUS_ORDER[left.status] - STATUS_ORDER[right.status] ||
        (left.nextExpiryOn ?? '9999-12-31').localeCompare(
          right.nextExpiryOn ?? '9999-12-31',
        ) ||
        left.vessel.name.localeCompare(right.vessel.name),
    );
  const start = (input.query.page - 1) * input.query.pageSize;

  return {
    asOf: formatCalendarDate(
      new Date(
        Date.UTC(
          input.asOf.getUTCFullYear(),
          input.asOf.getUTCMonth(),
          input.asOf.getUTCDate(),
        ),
      ),
    ),
    items: filtered.slice(start, start + input.query.pageSize),
    counts,
    totalVessels: allItems.length,
    page: input.query.page,
    pageSize: input.query.pageSize,
    total: filtered.length,
    totalPages: Math.ceil(filtered.length / input.query.pageSize),
  };
}
