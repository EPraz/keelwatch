import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ROLE_CODES, type AccessUserRecord, type RoleCode } from '../domain/access.types';
import type { AccessUserRepository } from '../ports/access-user.repository';

function isRoleCode(code: string): code is RoleCode {
  return ROLE_CODES.some((roleCode) => roleCode === code);
}

@Injectable()
export class PrismaAccessUserRepository implements AccessUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByExternalSubject(externalSubject: string): Promise<AccessUserRecord | null> {
    const user = await this.prisma.user.findUnique({
      where: { externalSubject },
      include: { roleAssignments: { include: { role: true } } },
    });

    if (!user) return null;

    return {
      id: user.id,
      externalSubject: user.externalSubject,
      displayName: user.displayName,
      email: user.email,
      status: user.status,
      roles: user.roleAssignments.map(({ role }) => role.code).filter(isRoleCode),
    };
  }
}
