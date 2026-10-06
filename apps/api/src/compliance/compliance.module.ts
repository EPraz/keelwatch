import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { FleetModule } from '../fleet/fleet.module';
import { ComplianceQueueService } from './application/compliance-queue.service';
import { ComplianceService } from './application/compliance.service';
import { NotificationJobService } from './application/notification-job.service';
import { ComplianceNotificationController } from './http/compliance-notification.controller';
import { ComplianceQueueController } from './http/compliance-queue.controller';
import { ComplianceController } from './http/compliance.controller';
import { PrismaComplianceRepository } from './infrastructure/prisma-compliance.repository';
import { PrismaNotificationRepository } from './infrastructure/prisma-notification.repository';
import { COMPLIANCE_REPOSITORY } from './ports/compliance.repository';
import { NOTIFICATION_REPOSITORY } from './ports/notification.repository';

@Module({
  imports: [AuditModule, FleetModule],
  controllers: [
    ComplianceController,
    ComplianceQueueController,
    ComplianceNotificationController,
  ],
  providers: [
    ComplianceService,
    ComplianceQueueService,
    NotificationJobService,
    PrismaComplianceRepository,
    PrismaNotificationRepository,
    { provide: COMPLIANCE_REPOSITORY, useExisting: PrismaComplianceRepository },
    { provide: NOTIFICATION_REPOSITORY, useExisting: PrismaNotificationRepository },
  ],
  exports: [ComplianceService],
})
export class ComplianceModule {}
