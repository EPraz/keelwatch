import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  AUDIT_EVENT_WRITER,
  type AuditEventWriter,
} from '../../audit/application/audit-event.writer';
import { PrismaService } from '../../database/prisma.service';
import {
  CrewMemberNotFoundError,
  QualificationConflictError,
} from '../domain/qualification';
import type {
  QualificationRepository,
  RecordQualificationInput,
} from '../ports/qualification.repository';
import type { QualificationKind } from '../domain/qualification';

const fields = {
  id: true,
  crewMemberId: true,
  kind: true,
  referenceNumber: true,
  validFrom: true,
  expiresOn: true,
  createdAt: true,
} as const;

@Injectable()
export class PrismaQualificationRepository implements QualificationRepository {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(AUDIT_EVENT_WRITER) private readonly audit: AuditEventWriter,
  ) {}

  findMember(id: string) {
    return this.prisma.crewMember.findUnique({
      where: { id },
      select: {
        id: true,
        displayName: true,
        crewNumber: true,
        createdAt: true,
      },
    });
  }

  findMemberByNumber(crewNumber: string) {
    return this.prisma.crewMember.findUnique({
      where: { crewNumber },
      select: { id: true, displayName: true, crewNumber: true, createdAt: true },
    });
  }

  intervals(crewMemberId: string, kinds: readonly QualificationKind[]) {
    return this.prisma.crewQualification.findMany({
      where: { crewMemberId, kind: { in: [...kinds] } },
      select: { kind: true, validFrom: true, expiresOn: true },
    });
  }

  async list(crewMemberId: string, skip: number, take: number) {
    const [items, total] = await this.prisma.$transaction([
      this.prisma.crewQualification.findMany({
        where: { crewMemberId },
        skip,
        take,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        select: fields,
      }),
      this.prisma.crewQualification.count({ where: { crewMemberId } }),
    ]);
    return { items, total };
  }

  async createWithAudit(input: RecordQualificationInput) {
    try {
      return await this.prisma.$transaction(async (transaction) => {
        if (
          !(await transaction.crewMember.findUnique({
            where: { id: input.crewMemberId },
            select: { id: true },
          }))
        )
          throw new CrewMemberNotFoundError();
        const record = await transaction.crewQualification.create({
          data: {
            crewMemberId: input.crewMemberId,
            kind: input.kind,
            referenceNumber: input.referenceNumber,
            validFrom: input.validFrom,
            expiresOn: input.expiresOn,
            createdById: input.actorUserId,
          },
          select: fields,
        });
        await this.audit.append(transaction, {
          actorUserId: input.actorUserId,
          action: 'CREW_QUALIFICATION_RECORDED',
          entityType: 'CREW_QUALIFICATION',
          entityId: record.id,
          metadata: {
            crewMemberId: input.crewMemberId,
            kind: input.kind,
            referenceNumber: input.referenceNumber,
          },
          correlationId: input.correlationId,
        });
        return record;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')
        throw new QualificationConflictError();
      throw error;
    }
  }
}
