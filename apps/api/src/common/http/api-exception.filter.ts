import {
  ArgumentsHost,
  Catch,
  HttpException,
  Logger,
  type ExceptionFilter,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import type { ApiErrorBody } from './api-exception';

interface ErrorResponse extends ApiErrorBody {
  readonly correlationId: string;
}

function isApiErrorBody(value: unknown): value is ApiErrorBody {
  return (
    typeof value === 'object' &&
    value !== null &&
    'code' in value &&
    typeof value.code === 'string' &&
    'message' in value &&
    typeof value.message === 'string'
  );
}

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<Request>();
    const response = context.getResponse<Response>();
    const status = exception instanceof HttpException ? exception.getStatus() : 500;
    const exceptionBody =
      exception instanceof HttpException ? exception.getResponse() : null;

    const body: ErrorResponse = isApiErrorBody(exceptionBody)
      ? { ...exceptionBody, correlationId: request.correlationId }
      : {
          code: status === 500 ? 'INTERNAL_ERROR' : 'REQUEST_FAILED',
          message:
            status === 500
              ? 'An unexpected error occurred.'
              : exception instanceof Error
                ? exception.message
                : 'The request could not be completed.',
          correlationId: request.correlationId,
        };

    if (status >= 500) {
      this.logger.error(
        JSON.stringify({
          message: 'Unhandled request failure',
          correlationId: request.correlationId,
          method: request.method,
          path: request.originalUrl,
          error: exception instanceof Error ? exception.name : 'UnknownError',
        }),
      );
    }

    response.status(status).json(body);
  }
}
