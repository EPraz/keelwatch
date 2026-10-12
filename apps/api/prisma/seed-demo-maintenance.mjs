export async function seedDemoMaintenance(transaction, dataset, actor, writer) {
  const { create, audit } = writer;
  for (const order of dataset.maintenance) {
    const data = {
      ...order,
      status: 'OPEN',
      reasonCode: null,
      assigneeId: order.status === 'OPEN' ? null : actor.id,
    };
    const added = await create(
      transaction.maintenanceOrder,
      data,
      'MAINTENANCE_ORDER_CREATED',
      'MAINTENANCE_ORDER',
      {
        vesselId: order.vesselId,
        title: order.title,
        category: order.category,
        priority: order.priority,
        status: 'OPEN',
        reasonCode: '',
        assigneeId: data.assigneeId ?? '',
        targetDate: order.targetDate?.toISOString().slice(0, 10) ?? '',
        revision: '1',
      },
    );
    if (!added) continue;
    const paths = {
      OPEN: [],
      PLANNED: ['PLANNED'],
      IN_PROGRESS: ['PLANNED', 'IN_PROGRESS'],
      BLOCKED: ['PLANNED', 'IN_PROGRESS', 'BLOCKED'],
      CLOSED: ['PLANNED', 'IN_PROGRESS', 'CLOSED'],
      CANCELLED: ['CANCELLED'],
    };
    const actions = {
      PLANNED: 'PLAN',
      IN_PROGRESS: 'START',
      BLOCKED: 'BLOCK',
      CLOSED: 'CLOSE',
      CANCELLED: 'CANCEL',
    };
    let status = 'OPEN';
    let revision = 1;
    for (const next of paths[order.status]) {
      revision += 1;
      const reasonCode = ['BLOCKED', 'CANCELLED'].includes(next)
        ? order.reasonCode
        : null;
      await transaction.maintenanceOrder.update({
        where: { id: order.id },
        data: { status: next, revision, reasonCode },
      });
      await audit(
        order,
        'MAINTENANCE_ORDER_TRANSITIONED',
        'MAINTENANCE_ORDER',
        {
          vesselId: order.vesselId,
          old_status: status,
          new_status: next,
          reasonCode: reasonCode ?? '',
          revision: String(revision),
          action: actions[next],
        },
        revision,
      );
      status = next;
    }
  }
}
