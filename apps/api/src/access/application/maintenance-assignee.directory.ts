import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { ROLE_CODES } from '../domain/access.types';
import { permissionsForRoles } from '../domain/permissions';

const eligibleWhere = {
  status: 'ACTIVE' as const,
  roleAssignments: {
    some: {
      role: {
        code: {
          in: ROLE_CODES.filter((role) =>
            permissionsForRoles([role]).includes('maintenance:write'),
          ),
        },
      },
    },
  },
};
const fields = { id: true, displayName: true } as const;

@Injectable()
export class MaintenanceAssigneeDirectory {
  constructor(private readonly prisma: PrismaService) {}
  async list(page: number) {
    const [items, total] = await this.prisma.$transaction(
      [
        this.prisma.user.findMany({
          where: eligibleWhere,
          select: fields,
          skip: (page - 1) * 20,
          take: 20,
          orderBy: [{ displayName: 'asc' }, { id: 'asc' }],
        }),
        this.prisma.user.count({ where: eligibleWhere }),
      ],
      { isolationLevel: 'RepeatableRead' },
    );
    return { items, total, page, pageSize: 20, totalPages: Math.ceil(total / 20) };
  }
  async findEligible(id: string, transaction: Prisma.TransactionClient) {
    return transaction.user.findFirst({
      where: { id, ...eligibleWhere },
      select: fields,
    });
  }
}
