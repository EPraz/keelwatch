import type { AccessActor } from '../access/domain/access.types';

declare global {
  namespace Express {
    interface Request {
      correlationId: string;
      actor?: AccessActor;
    }
  }
}

export {};
