import type { AccessUserRecord } from '../domain/access.types';

export const ACCESS_USER_REPOSITORY = Symbol('ACCESS_USER_REPOSITORY');

export interface AccessUserRepository {
  findByExternalSubject(externalSubject: string): Promise<AccessUserRecord | null>;
}
