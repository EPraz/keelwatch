import type { ExternalIdentity } from '../domain/access.types';

export const EXTERNAL_IDENTITY_VERIFIER = Symbol('EXTERNAL_IDENTITY_VERIFIER');

export interface ExternalIdentityVerifier {
  verify(accessToken: string): Promise<ExternalIdentity>;
}
