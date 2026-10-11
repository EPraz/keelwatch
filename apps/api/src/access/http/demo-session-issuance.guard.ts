import { CanActivate, ExecutionContext, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { ApiException } from '../../common/http/api-exception';
import { DemoSessions } from '../application/demo-sessions';

@Injectable()
export class DemoSessionIssuanceGuard implements CanActivate {
  private resetAt = 0;
  private attempts = 0;

  constructor(
    private readonly config: ConfigService,
    private readonly sessions: DemoSessions,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const response = context.switchToHttp().getResponse<Response>();
    response.setHeader('Cache-Control', 'no-store');
    if (!this.sessions.enabled) {
      throw new ApiException(
        HttpStatus.FORBIDDEN,
        'DEMO_ACCESS_DISABLED',
        'Demo access is unavailable.',
      );
    }
    const now = Date.now();
    if (now >= this.resetAt) {
      this.resetAt =
        now + this.config.getOrThrow<number>('DEMO_SESSION_WINDOW_SECONDS') * 1000;
      this.attempts = 0;
    }
    if (this.attempts >= this.config.getOrThrow<number>('DEMO_SESSION_LIMIT')) {
      const seconds = Math.ceil((this.resetAt - now) / 1000);
      response.setHeader('Retry-After', seconds);
      throw new ApiException(
        HttpStatus.TOO_MANY_REQUESTS,
        'DEMO_SESSION_LIMITED',
        `Demo sign-in is busy. Try again in ${seconds} seconds.`,
      );
    }
    this.attempts += 1;
    return true;
  }
}
