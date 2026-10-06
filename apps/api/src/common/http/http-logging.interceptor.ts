import {
  HttpException,
  Injectable,
  Logger,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import type { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { safeRequestPath } from './safe-request-path';

@Injectable()
export class HttpLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const startedAt = performance.now();
    const request = context.switchToHttp().getRequest<Request>();

    return next.handle().pipe(
      tap({
        next: () => this.logCompletion(request, context, startedAt),
        error: (error: unknown) =>
          this.logCompletion(
            request,
            context,
            startedAt,
            error instanceof HttpException ? error.getStatus() : 500,
          ),
      }),
    );
  }

  private logCompletion(
    request: Request,
    context: ExecutionContext,
    startedAt: number,
    failedStatus?: number,
  ): void {
    const response = context.switchToHttp().getResponse<Response>();
    this.logger.log(
      JSON.stringify({
        message: 'Request completed',
        correlationId: request.correlationId,
        method: request.method,
        path: safeRequestPath(request.originalUrl),
        statusCode: failedStatus ?? response.statusCode,
        durationMs: Math.round(performance.now() - startedAt),
        actorId: request.actor?.userId,
      }),
    );
  }
}
