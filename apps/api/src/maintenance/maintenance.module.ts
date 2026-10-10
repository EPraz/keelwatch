import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { FleetModule } from '../fleet/fleet.module';
import { AccessModule } from '../access/access.module';
import { MaintenanceService } from './application/maintenance.service';
import { MaintenanceController } from './http/maintenance.controller';
import { PrismaMaintenanceEditor } from './infrastructure/prisma-maintenance-editor';
import { PrismaMaintenanceLifecycle } from './infrastructure/prisma-maintenance-lifecycle';
import { MaintenanceHistoryService } from './application/maintenance-history.service';

@Module({
  imports: [AuditModule, FleetModule, AccessModule],
  controllers: [MaintenanceController],
  providers: [
    MaintenanceService,
    PrismaMaintenanceEditor,
    PrismaMaintenanceLifecycle,
    MaintenanceHistoryService,
  ],
})
export class MaintenanceModule {}
