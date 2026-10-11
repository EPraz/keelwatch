import { CanActivate, ExecutionContext, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { ApiException } from '../../common/http/api-exception';
import { DemoSessions } from '../application/demo-sessions';
import { DemoUsageBudget } from '../application/demo-usage-budget';

@Injectable()
export class DemoSessionIssuanceGuard implements CanActivate {
  private readonly budget: DemoUsageBudget;

  constructor(
    config: ConfigService,
    private readonly sessions: DemoSessions,
  ) {
    this.budget = new DemoUsageBudget(
      config.getOrThrow<number>('DEMO_SESSION_LIMIT'),
      config.getOrThrow<number>('DEMO_SESSION_WINDOW_SECONDS'),
    );
  }

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
    const seconds = this.budget.take();
    if (seconds !== null) {
      response.setHeader('Retry-After', seconds);
      throw new ApiException(
        HttpStatus.TOO_MANY_REQUESTS,
        'DEMO_SESSION_LIMITED',
        `Demo sign-in is busy. Try again in ${seconds} seconds.`,
      );
    }
    return true;
  }
}
