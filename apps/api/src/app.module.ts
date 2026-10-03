import {
  MiddlewareConsumer,
  Module,
  RequestMethod,
  type NestModule,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { resolve } from 'node:path';
import { AccessModule } from './access/access.module';
import { CorrelationIdMiddleware } from './common/http/correlation-id.middleware';
import { HttpLoggingInterceptor } from './common/http/http-logging.interceptor';
import { validateEnvironment } from './config/environment';
import { PrismaModule } from './database/prisma.module';
import { FleetModule } from './fleet/fleet.module';
import { HealthModule } from './health/health.module';

const repositoryEnvironmentFile = resolve(__dirname, '../../../.env');

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [repositoryEnvironmentFile],
      validate: validateEnvironment,
    }),
    PrismaModule,
    AccessModule,
    FleetModule,
    HealthModule,
  ],
  providers: [{ provide: APP_INTERCEPTOR, useClass: HttpLoggingInterceptor }],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(CorrelationIdMiddleware)
      .forRoutes({ path: '{*path}', method: RequestMethod.ALL });
  }
}
