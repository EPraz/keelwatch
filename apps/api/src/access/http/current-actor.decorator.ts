import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { AccessActor } from '../domain/access.types';

export const CurrentActor = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AccessActor => {
    const actor = context.switchToHttp().getRequest<Request>().actor;
    if (!actor) throw new Error('Authenticated actor was not attached to the request.');
    return actor;
  },
);
