import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AccessService } from './application/access.service';
import { DisabledIdentityVerifier } from './infrastructure/disabled-identity.verifier';
import { LocalIdentityVerifier } from './infrastructure/local-identity.verifier';
import { MemoryAccessUserRepository } from './infrastructure/memory-access-user.repository';
import { OidcIdentityVerifier } from './infrastructure/oidc-identity.verifier';
import { PrismaAccessUserRepository } from './infrastructure/prisma-access-user.repository';
import { AccessController } from './http/access.controller';
import { AuthenticationGuard } from './http/authentication.guard';
import { PermissionGuard } from './http/permission.guard';
import { ACCESS_USER_REPOSITORY } from './ports/access-user.repository';
import { EXTERNAL_IDENTITY_VERIFIER } from './ports/external-identity.verifier';

@Module({
  controllers: [AccessController],
  providers: [
    AccessService,
    LocalIdentityVerifier,
    OidcIdentityVerifier,
    DisabledIdentityVerifier,
    MemoryAccessUserRepository,
    PrismaAccessUserRepository,
    {
      provide: EXTERNAL_IDENTITY_VERIFIER,
      inject: [
        ConfigService,
        LocalIdentityVerifier,
        OidcIdentityVerifier,
        DisabledIdentityVerifier,
      ],
      useFactory: (
        config: ConfigService,
        local: LocalIdentityVerifier,
        oidc: OidcIdentityVerifier,
        disabled: DisabledIdentityVerifier,
      ) => {
        const mode = config.get<string>('AUTH_MODE');
        if (mode === 'local') return local;
        if (mode === 'oidc') return oidc;
        return disabled;
      },
    },
    {
      provide: ACCESS_USER_REPOSITORY,
      inject: [ConfigService, MemoryAccessUserRepository, PrismaAccessUserRepository],
      useFactory: (
        config: ConfigService,
        memory: MemoryAccessUserRepository,
        prisma: PrismaAccessUserRepository,
      ) => (config.get<string>('ACCESS_STORE') === 'prisma' ? prisma : memory),
    },
    { provide: APP_GUARD, useClass: AuthenticationGuard },
    { provide: APP_GUARD, useClass: PermissionGuard },
  ],
  exports: [AccessService],
})
export class AccessModule {}
