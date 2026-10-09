import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { ApiException } from '../../common/http/api-exception';
import { FleetService } from '../../fleet/application/fleet.service';
import { assignmentView, type AssignmentRole } from '../domain/assignment';
import { parseQualificationDate } from '../domain/qualification';
import { evaluateRequirements, requiredKinds } from '../domain/requirement-evaluation';
import {
  ASSIGNMENT_REPOSITORY,
  type AssignmentRepository,
} from '../ports/assignment.repository';
import {
  QUALIFICATION_REPOSITORY,
  type QualificationRepository,
} from '../ports/qualification.repository';

@Injectable()
export class CompositionService {
  constructor(
    private readonly fleet: FleetService,
    @Inject(ASSIGNMENT_REPOSITORY) private readonly assignments: AssignmentRepository,
    @Inject(QUALIFICATION_REPOSITORY)
    private readonly qualifications: QualificationRepository,
  ) {}

  async consult(
    vesselId: string,
    query: { date?: string; role?: AssignmentRole; page: number },
  ) {
    const now = new Date();
    const date = query.date ?? now.toISOString().slice(0, 10);
    const selectedDay = parseQualificationDate(date);
    if (!selectedDay)
      throw new ApiException(
        HttpStatus.BAD_REQUEST,
        'COMPOSITION_DATE_INVALID',
        'Use a valid calendar date.',
        { date: ['Use a valid date between years 0001 and 9999.'] },
      );
    const vessel = await this.fleet.findRecordById(vesselId);
    const pageSize = 20;
    const records = await this.assignments.composition(
      vesselId,
      selectedDay,
      query.role,
      (query.page - 1) * pageSize,
      pageSize,
    );
    const evidence = await this.qualifications.intervalsForMembers(
      records.items.map((item) => ({
        crewMemberId: item.crewMemberId,
        kinds: requiredKinds(item.role),
      })),
    );
    const consultedAt = now.toISOString();
    return {
      vessel: { id: vessel.id, status: vessel.status },
      date,
      role: query.role ?? null,
      consultedAt,
      items: records.items.map((record) => {
        const plan = assignmentView(record, selectedDay);
        return {
          assignmentId: plan.id,
          vesselId,
          crewMemberId: plan.crewMemberId,
          crewNumber: plan.crewNumber,
          displayName: plan.displayName,
          role: plan.role,
          roleLabel: plan.roleLabel,
          startsOn: plan.startsOn,
          endsOn: plan.endsOn,
          consultedAt,
          ...evaluateRequirements(
            record.role,
            record.startsOn,
            record.endsOn,
            evidence.filter((item) => item.crewMemberId === record.crewMemberId),
          ),
        };
      }),
      page: query.page,
      pageSize,
      total: records.total,
      totalPages: Math.ceil(records.total / pageSize),
    };
  }
}
