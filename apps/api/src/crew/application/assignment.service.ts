import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { ApiException } from '../../common/http/api-exception';
import { FleetService } from '../../fleet/application/fleet.service';
import {
  AssignmentCrewNotFoundError,
  AssignmentOverlapError,
  assignmentView,
  AssignmentNotFoundError,
  AssignmentCancellationConflictError,
} from '../domain/assignment';
import { parseQualificationDate } from '../domain/qualification';
import {
  ASSIGNMENT_REPOSITORY,
  type AssignmentRepository,
  type CreateAssignmentInput,
  type CancelAssignmentInput,
} from '../ports/assignment.repository';

@Injectable()
export class AssignmentService {
  constructor(
    @Inject(ASSIGNMENT_REPOSITORY) private readonly assignments: AssignmentRepository,
    private readonly fleet: FleetService,
  ) {}

  async workspace(vesselId: string, page: number) {
    const vessel = await this.fleet.findRecordById(vesselId);
    const pageSize = 20;
    const records = await this.assignments.list(
      vesselId,
      (page - 1) * pageSize,
      pageSize,
    );
    const now = new Date();
    return {
      vessel: {
        id: vessel.id,
        name: vessel.name,
        registryNumber: vessel.registryNumber,
        status: vessel.status,
      },
      items: records.items.map((item) => assignmentView(item, now)),
      asOf: now.toISOString().slice(0, 10),
      page,
      pageSize,
      total: records.total,
      totalPages: Math.ceil(records.total / pageSize),
    };
  }

  async create(
    input: Omit<CreateAssignmentInput, 'startsOn' | 'endsOn'> & {
      startsOn: string;
      endsOn: string;
    },
  ) {
    const vessel = await this.fleet.findRecordById(input.vesselId);
    if (vessel.status !== 'ACTIVE')
      throw new ApiException(
        HttpStatus.CONFLICT,
        'VESSEL_ARCHIVED',
        'Archived vessels cannot receive new crew assignments.',
      );
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
    try {
      const record = await this.assignments.createWithAudit({
        ...input,
        startsOn,
        endsOn,
        crewNumber: input.crewNumber.trim().toUpperCase(),
      });
      return assignmentView(record, new Date());
    } catch (error) {
      if (error instanceof AssignmentCrewNotFoundError)
        throw new ApiException(
          HttpStatus.NOT_FOUND,
          'CREW_MEMBER_NOT_FOUND',
          'No crew profile has that reference. Open Crew profiles to find or register one.',
          { crewNumber: ['Use an existing crew reference.'] },
        );
      if (error instanceof AssignmentOverlapError)
        throw new ApiException(
          HttpStatus.CONFLICT,
          'CREW_ASSIGNMENT_OVERLAP',
          'This crew member already has an assignment sharing these dates. Choose a non-overlapping period; both boundary days are included.',
          {
            startsOn: ['Choose a non-overlapping period.'],
            endsOn: ['Choose a non-overlapping period.'],
          },
        );
      throw error;
    }
  }

  async cancel(input: CancelAssignmentInput) {
    await this.fleet.findRecordById(input.vesselId);
    try {
      return assignmentView(await this.assignments.cancelWithAudit(input), new Date());
    } catch (error) {
      if (error instanceof AssignmentNotFoundError)
        throw new ApiException(
          HttpStatus.NOT_FOUND,
          'CREW_ASSIGNMENT_NOT_FOUND',
          'No assignment plan was found in this vessel.',
        );
      if (error instanceof AssignmentCancellationConflictError)
        throw new ApiException(
          HttpStatus.CONFLICT,
          'CREW_ASSIGNMENT_ALREADY_CANCELLED',
          'This plan was already cancelled with a different reason. Its original cancellation cannot be changed.',
          { reason: ['Keep the original cancellation reason.'] },
        );
      throw error;
    }
  }
}
