import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { CrewService } from './application/crew.service';
import { CrewController } from './http/crew.controller';
import { PrismaCrewRepository } from './infrastructure/prisma-crew.repository';
import { CREW_REPOSITORY } from './ports/crew.repository';
import { QualificationService } from './application/qualification.service';
import { QualificationController } from './http/qualification.controller';
import { PrismaQualificationRepository } from './infrastructure/prisma-qualification.repository';
import { QUALIFICATION_REPOSITORY } from './ports/qualification.repository';

@Module({
  imports: [AuditModule],
  controllers: [CrewController, QualificationController],
  providers: [
    CrewService,
    { provide: CREW_REPOSITORY, useClass: PrismaCrewRepository },
    QualificationService,
    { provide: QUALIFICATION_REPOSITORY, useClass: PrismaQualificationRepository },
  ],
})
export class CrewModule {}
