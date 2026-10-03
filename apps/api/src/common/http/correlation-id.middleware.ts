import { Injectable, type NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';

const SAFE_CORRELATION_ID = /^[A-Za-z0-9._:-]{1,100}$/u;

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(request: Request, response: Response, next: NextFunction): void {
    const requestedId = request.header('x-correlation-id');
    request.correlationId =
      requestedId && SAFE_CORRELATION_ID.test(requestedId) ? requestedId : randomUUID();
    response.setHeader('x-correlation-id', request.correlationId);
    next();
  }
}
