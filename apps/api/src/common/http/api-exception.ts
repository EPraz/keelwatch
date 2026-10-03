import { HttpException, type HttpStatus } from '@nestjs/common';

export type FieldErrors = Readonly<Record<string, readonly string[]>>;

export interface ApiErrorBody {
  readonly code: string;
  readonly message: string;
  readonly fieldErrors?: FieldErrors;
}

export class ApiException extends HttpException {
  constructor(
    status: HttpStatus,
    code: string,
    message: string,
    fieldErrors?: FieldErrors,
  ) {
    super({ code, message, ...(fieldErrors ? { fieldErrors } : {}) }, status);
  }
}
