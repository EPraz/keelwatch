import { CanActivate, ExecutionContext, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import type { Request, Response } from 'express';
import { ApiException } from '../../common/http/api-exception';
import type { Permission } from '../domain/access.types';
import { DEMO_MANAGER_SUBJECT } from '../domain/demo-account';
import { REQUIRED_PERMISSIONS_KEY } from './require-permissions.decorator';
import { DemoUsageBudget } from '../application/demo-usage-budget';

@Injectable()
export class DemoWriteGuard implements CanActivate {
  private readonly budget: DemoUsageBudget;

  constructor(
    config: ConfigService,
    private readonly reflector: Reflector,
  ) {
    this.budget = new DemoUsageBudget(
      config.getOrThrow<number>('DEMO_WRITE_LIMIT'),
      config.getOrThrow<number>('DEMO_WRITE_WINDOW_SECONDS'),
    );
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    if (request.actor?.externalSubject !== DEMO_MANAGER_SUBJECT) return true;
    const required = this.reflector.getAllAndOverride<readonly Permission[]>(
      REQUIRED_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (
      !['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method) ||
      !required?.some((permission) => permission.endsWith(':write'))
    )
      return true;

    const seconds = this.budget.take();
    if (seconds !== null) {
      context.switchToHttp().getResponse<Response>().setHeader('Retry-After', seconds);
      throw new ApiException(
        HttpStatus.TOO_MANY_REQUESTS,
        'DEMO_WRITE_LIMITED',
        `Demo changes are busy. Try again in ${seconds} seconds. Reading remains available.`,
      );
    }
    return true;
  }
}
