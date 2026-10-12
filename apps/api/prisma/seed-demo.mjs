import { demoScenarios } from './demo-scenarios.mjs';
import { demoRecordWriter } from './demo-record-writer.mjs';
import { seedDemoCrew } from './seed-demo-crew.mjs';
import { seedDemoMaintenance } from './seed-demo-maintenance.mjs';

export async function seedDemoDataset(prisma) {
  return prisma.$transaction(
    async (transaction) => {
      await transaction.$queryRaw`SELECT pg_advisory_xact_lock(970014)::text`;
      const actor = await transaction.user.findUnique({
        where: { externalSubject: 'demo:manager' },
        include: { roleAssignments: { include: { role: true } } },
      });
      if (
        !actor ||
        actor.status !== 'ACTIVE' ||
        actor.roleAssignments.length !== 1 ||
        actor.roleAssignments[0].role.code !== 'OPERATIONS_MANAGER'
      ) {
        throw new Error(
          'Demo dataset requires the active, fixed-role Demo Manager from the base seed.',
        );
      }
      const type = await transaction.certificateType.findUnique({
        where: { code: 'SAFETY_EQUIPMENT' },
      });
      if (!type?.isRequired)
        throw new Error('Demo dataset requires the existing safety certificate catalog.');
      const original = await transaction.vessel.findUnique({
        where: { id: '5eed0001-0000-4000-8000-000000000001' },
      });
      const today = new Date(
        (original?.createdAt ?? new Date()).toISOString().slice(0, 10),
      );
      const dataset = demoScenarios(today);
      const writer = demoRecordWriter(transaction, actor, today);
      const { create, audit } = writer;
      for (const vessel of dataset.vessels) {
        const added = await create(
          transaction.vessel,
          { ...vessel, status: 'ACTIVE' },
          'VESSEL_CREATED',
          'VESSEL',
          {
            name: vessel.name,
            registryNumber: vessel.registryNumber,
          },
        );
        if (added && vessel.status === 'ARCHIVED') {
          await transaction.vessel.update({
            where: { id: vessel.id },
            data: { status: 'ARCHIVED' },
          });
          await audit(vessel, 'VESSEL_UPDATED', 'VESSEL', { changedFields: 'status' }, 2);
        }
      }
      for (const certificate of dataset.certificates) {
        const added = await create(
          transaction.certificate,
          { ...certificate, archivedAt: null, certificateTypeId: type.id },
          'CERTIFICATE_CREATED',
          'CERTIFICATE',
          {
            vesselId: certificate.vesselId,
            certificateTypeCode: type.code,
            referenceNumber: certificate.referenceNumber,
          },
        );
        if (added && certificate.archivedAt) {
          await transaction.certificate.update({
            where: { id: certificate.id },
            data: { archivedAt: certificate.archivedAt },
          });
          await audit(
            certificate,
            'CERTIFICATE_ARCHIVED',
            'CERTIFICATE',
            {
              vesselId: certificate.vesselId,
              certificateTypeCode: type.code,
              referenceNumber: certificate.referenceNumber,
            },
            2,
          );
        }
      }
      await seedDemoCrew(transaction, dataset, actor, writer);
      await seedDemoMaintenance(transaction, dataset, actor, writer);
      return { referenceDay: today.toISOString().slice(0, 10), ...writer.summary() };
    },
    { timeout: 60_000 },
  );
}
