import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  AUDIT_EVENT_WRITER,
  type AuditEventWriter,
} from '../../audit/application/audit-event.writer';
import { PrismaService } from '../../database/prisma.service';
import {
  AssignmentCrewNotFoundError,
  AssignmentOverlapError,
  AssignmentNotFoundError,
  AssignmentCancellationConflictError,
} from '../domain/assignment';
import type {
  AssignmentRepository,
  CreateAssignmentInput,
  CancelAssignmentInput,
} from '../ports/assignment.repository';

const fields = {
  id: true,
  crewMemberId: true,
  vesselId: true,
  role: true,
  startsOn: true,
  endsOn: true,
  createdAt: true,
  cancelledAt: true,
  cancellationReason: true,
  member: { select: { displayName: true, crewNumber: true } },
} as const;

@Injectable()
export class PrismaAssignmentRepository implements AssignmentRepository {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(AUDIT_EVENT_WRITER) private readonly audit: AuditEventWriter,
  ) {}

  async list(vesselId: string, skip: number, take: number) {
    const [items, total] = await this.prisma.$transaction([
      this.prisma.crewAssignment.findMany({
        where: { vesselId },
        skip,
        take,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        select: fields,
      }),
      this.prisma.crewAssignment.count({ where: { vesselId } }),
    ]);
    return { items, total };
  }

  createWithAudit(input: CreateAssignmentInput) {
    return this.prisma.$transaction(
      async (transaction) => {
        // Lock the profile before checking every vessel: concurrent requests serialize.
        const members = await transaction.$queryRaw<{ id: string }[]>(Prisma.sql`
        SELECT id FROM crew_members WHERE crew_number = ${input.crewNumber} FOR UPDATE
      `);
        const member = members[0];
        if (!member) throw new AssignmentCrewNotFoundError();
        const overlap = await transaction.crewAssignment.findFirst({
          where: {
            crewMemberId: member.id,
            cancelledAt: null,
            startsOn: { lte: input.endsOn },
            endsOn: { gte: input.startsOn },
          },
          select: { id: true },
        });
        if (overlap) throw new AssignmentOverlapError();
        const record = await transaction.crewAssignment.create({
          data: {
            crewMemberId: member.id,
            vesselId: input.vesselId,
            role: input.role,
            startsOn: input.startsOn,
            endsOn: input.endsOn,
            createdById: input.actorUserId,
          },
          select: fields,
        });
        await this.audit.append(transaction, {
          actorUserId: input.actorUserId,
          action: 'CREW_ASSIGNMENT_CREATED',
          entityType: 'VESSEL',
          entityId: input.vesselId,
          metadata: {
            assignmentId: record.id,
            crewNumber: input.crewNumber,
            role: input.role,
            startsOn: input.startsOn.toISOString().slice(0, 10),
            endsOn: input.endsOn.toISOString().slice(0, 10),
          },
          correlationId: input.correlationId,
        });
        return record;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
    );
  }

  cancelWithAudit(input: CancelAssignmentInput) {
    return this.prisma.$transaction(
      async (transaction) => {
        const original = await transaction.crewAssignment.findFirst({
          where: { id: input.assignmentId, vesselId: input.vesselId },
          select: { crewMemberId: true },
        });
        if (!original) throw new AssignmentNotFoundError();
        // Same member lock as creation: releasing and reserving periods have one order.
        await transaction.$queryRaw(
          Prisma.sql`SELECT id FROM crew_members WHERE id = ${original.crewMemberId}::uuid FOR UPDATE`,
        );
        const record = await transaction.crewAssignment.findUniqueOrThrow({
          where: { id: input.assignmentId },
          select: fields,
        });
        if (record.cancelledAt) {
          if (record.cancellationReason !== input.reason)
            throw new AssignmentCancellationConflictError();
          return record;
        }
        const cancelled = await transaction.crewAssignment.update({
          where: { id: input.assignmentId },
          data: {
            cancelledAt: new Date(),
            cancelledById: input.actorUserId,
            cancellationReason: input.reason,
          },
          select: fields,
        });
        await this.audit.append(transaction, {
          actorUserId: input.actorUserId,
          action: 'CREW_ASSIGNMENT_CANCELLED',
          entityType: 'VESSEL',
          entityId: input.vesselId,
          correlationId: input.correlationId,
          metadata: {
            assignmentId: input.assignmentId,
            crewNumber: record.member.crewNumber,
            reason: input.reason,
            role: record.role,
            startsOn: record.startsOn.toISOString().slice(0, 10),
            endsOn: record.endsOn.toISOString().slice(0, 10),
          },
        });
        return cancelled;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
    );
  }
}
