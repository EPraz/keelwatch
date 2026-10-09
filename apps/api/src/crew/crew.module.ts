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
import { FleetModule } from '../fleet/fleet.module';
import { AssignmentController } from './http/assignment.controller';
import { AssignmentService } from './application/assignment.service';
import { ASSIGNMENT_REPOSITORY } from './ports/assignment.repository';
import { PrismaAssignmentRepository } from './infrastructure/prisma-assignment.repository';
import { RequirementEvaluationService } from './application/requirement-evaluation.service';
import { CompositionService } from './application/composition.service';
import { CompositionController } from './http/composition.controller';

@Module({
  imports: [AuditModule, FleetModule],
  controllers: [
    CrewController,
    QualificationController,
    AssignmentController,
    CompositionController,
  ],
  providers: [
    CompositionService,
    RequirementEvaluationService,
    CrewService,
    { provide: CREW_REPOSITORY, useClass: PrismaCrewRepository },
    QualificationService,
    { provide: QUALIFICATION_REPOSITORY, useClass: PrismaQualificationRepository },
    AssignmentService,
    { provide: ASSIGNMENT_REPOSITORY, useClass: PrismaAssignmentRepository },
  ],
})
export class CrewModule {}
