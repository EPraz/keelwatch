import type { PrismaService } from '../../database/prisma.service';
import type { ComplianceWorkspaceData } from '../ports/compliance.repository';
import {
  toCertificateRecord,
  toCertificateTypeRecord,
} from './certificate.persistence-mapper';

export async function loadComplianceData(
  prisma: PrismaService,
  vesselIds: readonly string[],
): Promise<ComplianceWorkspaceData> {
  const [certificateTypes, certificates] = await prisma.$transaction([
    prisma.certificateType.findMany({ orderBy: [{ name: 'asc' }, { id: 'asc' }] }),
    prisma.certificate.findMany({
      where: { vesselId: { in: [...vesselIds] } },
      include: { certificateType: true },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    }),
  ]);
  return {
    certificateTypes: certificateTypes.map(toCertificateTypeRecord),
    certificates: certificates.map(toCertificateRecord),
  };
}
