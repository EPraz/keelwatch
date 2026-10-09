import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { FleetModule } from '../fleet/fleet.module';
import { AccessModule } from '../access/access.module';
import { MaintenanceService } from './application/maintenance.service';
import { MaintenanceController } from './http/maintenance.controller';
import { PrismaMaintenanceEditor } from './infrastructure/prisma-maintenance-editor';
import { PrismaMaintenanceLifecycle } from './infrastructure/prisma-maintenance-lifecycle';

@Module({
  imports: [AuditModule, FleetModule, AccessModule],
  controllers: [MaintenanceController],
  providers: [MaintenanceService, PrismaMaintenanceEditor, PrismaMaintenanceLifecycle],
})
export class MaintenanceModule {}
