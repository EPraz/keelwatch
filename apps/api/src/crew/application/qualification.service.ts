import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { ApiException } from '../../common/http/api-exception';
import {
  CrewMemberNotFoundError,
  parseQualificationDate,
  qualificationView,
  QualificationConflictError,
} from '../domain/qualification';
import {
  QUALIFICATION_REPOSITORY,
  type QualificationRepository,
  type RecordQualificationInput,
} from '../ports/qualification.repository';

@Injectable()
export class QualificationService {
  constructor(
    @Inject(QUALIFICATION_REPOSITORY)
    private readonly repository: QualificationRepository,
  ) {}

  async workspace(crewMemberId: string, page: number) {
    const member = await this.repository.findMember(crewMemberId);
    if (!member) throw this.notFound();
    const pageSize = 20;
    const records = await this.repository.list(
      crewMemberId,
      (page - 1) * pageSize,
      pageSize,
    );
    const now = new Date();
    return {
      member,
      asOf: now.toISOString().slice(0, 10),
      items: records.items.map((record) => qualificationView(record, now)),
      total: records.total,
      page,
      pageSize,
      totalPages: Math.ceil(records.total / pageSize),
    };
  }

  async record(
    input: Omit<RecordQualificationInput, 'validFrom' | 'expiresOn'> & {
      validFrom: string;
      expiresOn: string;
    },
  ) {
    const validFrom = parseQualificationDate(input.validFrom);
    const expiresOn = parseQualificationDate(input.expiresOn);
    if (!validFrom || !expiresOn || validFrom > expiresOn) {
      throw new ApiException(
        HttpStatus.BAD_REQUEST,
        'QUALIFICATION_DATES_INVALID',
        'Use valid calendar dates with valid from on or before expires on.',
        {
          validFrom: ['Check the validity dates.'],
          expiresOn: ['Check the validity dates.'],
        },
      );
    }
    try {
      const record = await this.repository.createWithAudit({
        ...input,
        validFrom,
        expiresOn,
        referenceNumber: input.referenceNumber.trim().toUpperCase(),
      });
      return qualificationView(record, new Date());
    } catch (error) {
      if (error instanceof CrewMemberNotFoundError) throw this.notFound();
      if (error instanceof QualificationConflictError) {
        throw new ApiException(
          HttpStatus.CONFLICT,
          'QUALIFICATION_REFERENCE_CONFLICT',
          'This qualification reference is already recorded for this crew profile.',
          { referenceNumber: ['Use a unique reference for this profile.'] },
        );
      }
      throw error;
    }
  }

  private notFound() {
    return new ApiException(
      HttpStatus.NOT_FOUND,
      'CREW_MEMBER_NOT_FOUND',
      'The crew profile was not found.',
    );
  }
}
