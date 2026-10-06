import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { CrewService } from './application/crew.service';
import { CrewController } from './http/crew.controller';
import { PrismaCrewRepository } from './infrastructure/prisma-crew.repository';
import { CREW_REPOSITORY } from './ports/crew.repository';

@Module({
  imports: [AuditModule],
  controllers: [CrewController],
  providers: [CrewService, { provide: CREW_REPOSITORY, useClass: PrismaCrewRepository }],
})
export class CrewModule {}
