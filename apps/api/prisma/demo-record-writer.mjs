export function demoRecordWriter(transaction, actor, today) {
  let created = 0;
  let preserved = 0;
  async function audit(data, action, entityType, metadata, step = 1) {
    await transaction.auditEvent.create({
      data: {
        id: data.id.replace('-0000-', `-${String(step).padStart(4, '0')}-`),
        actorUserId: actor.id,
        action,
        entityType,
        entityId: entityType === 'VESSEL' ? (data.vesselId ?? data.id) : data.id,
        occurredAt: today,
        metadata: { ...metadata, demoSeed: 'operational-v1' },
        correlationId: 'demo-dataset-v1',
      },
    });
  }
  async function create(model, data, action, entityType, metadata) {
    if (await model.findUnique({ where: { id: data.id } })) {
      preserved += 1;
      return false;
    }
    await model.create({
      data: { ...data, createdAt: today, createdById: actor.id },
    });
    await audit(data, action, entityType, metadata);
    created += 1;
    return true;
  }

  return { create, audit, summary: () => ({ created, preserved }) };
}
