import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  AUDIT_EVENT_WRITER,
  type AuditEventWriter,
} from '../../audit/application/audit-event.writer';
import { PrismaService } from '../../database/prisma.service';
import { CrewNumberConflictError } from '../domain/crew-member';
import type { CrewRepository, RegisterCrewInput } from '../ports/crew.repository';

const publicFields = {
  id: true,
  displayName: true,
  crewNumber: true,
  createdAt: true,
} as const;

@Injectable()
export class PrismaCrewRepository implements CrewRepository {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(AUDIT_EVENT_WRITER) private readonly audit: AuditEventWriter,
  ) {}

  async createWithAudit(input: RegisterCrewInput) {
    try {
      return await this.prisma.$transaction(async (transaction) => {
        const member = await transaction.crewMember.create({
          data: {
            displayName: input.displayName,
            crewNumber: input.crewNumber,
            createdById: input.actorUserId,
          },
          select: publicFields,
        });
        await this.audit.append(transaction, {
          actorUserId: input.actorUserId,
          action: 'CREW_MEMBER_CREATED',
          entityType: 'CREW_MEMBER',
          entityId: member.id,
          metadata: { crewNumber: member.crewNumber },
          correlationId: input.correlationId,
        });
        return member;
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new CrewNumberConflictError();
      }
      throw error;
    }
  }

  async list(input: { readonly skip: number; readonly take: number }) {
    const [items, total] = await this.prisma.$transaction([
      this.prisma.crewMember.findMany({
        ...input,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        select: publicFields,
      }),
      this.prisma.crewMember.count(),
    ]);
    return { items, total };
  }
}
