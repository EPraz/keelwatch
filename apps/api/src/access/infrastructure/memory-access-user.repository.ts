import { Injectable } from '@nestjs/common';
import type { AccessUserRecord } from '../domain/access.types';
import type { AccessUserRepository } from '../ports/access-user.repository';

const LOCAL_USERS: readonly AccessUserRecord[] = [
  {
    id: '00000000-0000-4000-8000-000000000001',
    externalSubject: 'local:operations-manager',
    displayName: 'Morgan Reed',
    email: 'morgan.reed@example.test',
    status: 'ACTIVE',
    roles: ['OPERATIONS_MANAGER'],
  },
  {
    id: '00000000-0000-4000-8000-000000000002',
    externalSubject: 'local:auditor',
    displayName: 'Avery Chen',
    email: 'avery.chen@example.test',
    status: 'ACTIVE',
    roles: ['AUDITOR'],
  },
  {
    id: '00000000-0000-4000-8000-000000000003',
    externalSubject: 'local:inactive',
    displayName: 'Inactive Demo User',
    email: 'inactive.user@example.test',
    status: 'INACTIVE',
    roles: ['AUDITOR'],
  },
];

@Injectable()
export class MemoryAccessUserRepository implements AccessUserRepository {
  findByExternalSubject(externalSubject: string): Promise<AccessUserRecord | null> {
    return Promise.resolve(
      LOCAL_USERS.find((user) => user.externalSubject === externalSubject) ?? null,
    );
  }
}
