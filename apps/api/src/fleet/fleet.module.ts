import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { FleetService } from './application/fleet.service';
import { FleetController } from './http/fleet.controller';
import { PrismaVesselRepository } from './infrastructure/prisma-vessel.repository';
import { VESSEL_REPOSITORY } from './ports/vessel.repository';

@Module({
  imports: [AuditModule],
  controllers: [FleetController],
  providers: [
    FleetService,
    PrismaVesselRepository,
    { provide: VESSEL_REPOSITORY, useExisting: PrismaVesselRepository },
  ],
  exports: [FleetService, VESSEL_REPOSITORY],
})
export class FleetModule {}
