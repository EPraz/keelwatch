import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { ApiException } from '../../common/http/api-exception';
import { FleetService } from '../../fleet/application/fleet.service';
import { parseQualificationDate } from '../domain/qualification';
import { evaluateRequirements, requiredKinds } from '../domain/requirement-evaluation';
import type { AssignmentRole } from '../domain/assignment';
import {
  QUALIFICATION_REPOSITORY,
  type QualificationRepository,
} from '../ports/qualification.repository';

@Injectable()
export class RequirementEvaluationService {
  constructor(
    private readonly fleet: FleetService,
    @Inject(QUALIFICATION_REPOSITORY)
    private readonly qualifications: QualificationRepository,
  ) {}

  async evaluate(
    vesselId: string,
    input: { crewNumber: string; role: AssignmentRole; startsOn: string; endsOn: string },
  ) {
    await this.fleet.findRecordById(vesselId);
    const startsOn = parseQualificationDate(input.startsOn);
    const endsOn = parseQualificationDate(input.endsOn);
    if (!startsOn || !endsOn || startsOn > endsOn)
      throw new ApiException(
        HttpStatus.BAD_REQUEST,
        'ASSIGNMENT_DATES_INVALID',
        'Use valid calendar dates with start on or before end.',
        {
          startsOn: ['Check the assignment dates.'],
          endsOn: ['Check the assignment dates.'],
        },
      );
    const member = await this.qualifications.findMemberByNumber(input.crewNumber);
    if (!member)
      throw new ApiException(
        HttpStatus.NOT_FOUND,
        'CREW_MEMBER_NOT_FOUND',
        'No crew profile has that reference.',
        { crewNumber: ['Use an existing crew reference.'] },
      );
    const evidence = await this.qualifications.intervals(
      member.id,
      requiredKinds(input.role),
    );
    return {
      vesselId,
      crewMemberId: member.id,
      displayName: member.displayName,
      ...input,
      consultedAt: new Date().toISOString(),
      ...evaluateRequirements(input.role, startsOn, endsOn, evidence),
    };
  }
}
