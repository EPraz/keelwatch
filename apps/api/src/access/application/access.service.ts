import { Inject, Injectable } from '@nestjs/common';
import type { AccessActor } from '../domain/access.types';
import {
  ACCESS_USER_REPOSITORY,
  type AccessUserRepository,
} from '../ports/access-user.repository';

export interface CurrentUserResponse {
  readonly id: string;
  readonly displayName: string;
  readonly email: string;
  readonly roles: AccessActor['roles'];
  readonly permissions: AccessActor['permissions'];
}

@Injectable()
export class AccessService {
  constructor(
    @Inject(ACCESS_USER_REPOSITORY)
    private readonly users: AccessUserRepository,
  ) {}

  currentUser(actor: AccessActor): CurrentUserResponse {
    return {
      id: actor.userId,
      displayName: actor.displayName,
      email: actor.email,
      roles: actor.roles,
      permissions: actor.permissions,
    };
  }

  findByExternalSubject(externalSubject: string) {
    return this.users.findByExternalSubject(externalSubject);
  }
}
