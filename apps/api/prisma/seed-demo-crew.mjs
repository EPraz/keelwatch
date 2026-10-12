export async function seedDemoCrew(transaction, dataset, actor, writer) {
  const { create, audit } = writer;
  for (const member of dataset.crew) {
    await create(transaction.crewMember, member, 'CREW_MEMBER_CREATED', 'CREW_MEMBER', {
      crewNumber: member.crewNumber,
    });
  }
  for (const qualification of dataset.qualifications) {
    await create(
      transaction.crewQualification,
      qualification,
      'CREW_QUALIFICATION_RECORDED',
      'CREW_QUALIFICATION',
      {
        crewMemberId: qualification.crewMemberId,
        kind: qualification.kind,
        referenceNumber: qualification.referenceNumber,
      },
    );
  }
  for (const plan of dataset.assignments) {
    if (!(await transaction.crewAssignment.findUnique({ where: { id: plan.id } }))) {
      await transaction.$queryRaw`SELECT id FROM crew_members WHERE id = ${plan.crewMemberId}::uuid FOR UPDATE`;
      if (
        await transaction.crewAssignment.findFirst({
          where: {
            crewMemberId: plan.crewMemberId,
            cancelledAt: null,
            startsOn: { lte: plan.endsOn },
            endsOn: { gte: plan.startsOn },
          },
        })
      )
        throw new Error(
          'A retained plan overlaps a reserved demo period. No records were changed.',
        );
    }
    const member = dataset.crew.find((item) => item.id === plan.crewMemberId);
    const added = await create(
      transaction.crewAssignment,
      { ...plan, cancelledAt: null, cancellationReason: null },
      'CREW_ASSIGNMENT_CREATED',
      'VESSEL',
      {
        assignmentId: plan.id,
        crewNumber: member.crewNumber,
        role: plan.role,
        startsOn: plan.startsOn.toISOString().slice(0, 10),
        endsOn: plan.endsOn.toISOString().slice(0, 10),
      },
    );
    if (added && plan.cancelledAt) {
      await transaction.crewAssignment.update({
        where: { id: plan.id },
        data: {
          cancelledAt: plan.cancelledAt,
          cancelledById: actor.id,
          cancellationReason: plan.cancellationReason,
        },
      });
      await audit(
        plan,
        'CREW_ASSIGNMENT_CANCELLED',
        'VESSEL',
        {
          assignmentId: plan.id,
          crewNumber: member.crewNumber,
          reason: plan.cancellationReason,
          role: plan.role,
          startsOn: plan.startsOn.toISOString().slice(0, 10),
          endsOn: plan.endsOn.toISOString().slice(0, 10),
        },
        2,
      );
    }
  }
}
