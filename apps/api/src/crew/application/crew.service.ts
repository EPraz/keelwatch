import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { ApiException } from '../../common/http/api-exception';
import { CrewNumberConflictError } from '../domain/crew-member';
import {
  CREW_REPOSITORY,
  type CrewRepository,
  type RegisterCrewInput,
} from '../ports/crew.repository';

@Injectable()
export class CrewService {
  constructor(@Inject(CREW_REPOSITORY) private readonly crew: CrewRepository) {}

  async register(input: RegisterCrewInput) {
    try {
      return await this.crew.createWithAudit({
        ...input,
        displayName: input.displayName.trim(),
        crewNumber: input.crewNumber.trim().toUpperCase(),
      });
    } catch (error) {
      if (error instanceof CrewNumberConflictError) {
        throw new ApiException(
          HttpStatus.CONFLICT,
          'CREW_NUMBER_CONFLICT',
          error.message,
          {
            crewNumber: ['Use a unique demo crew number.'],
          },
        );
      }
      throw error;
    }
  }

  async list(page: number) {
    const pageSize = 20;
    const result = await this.crew.list({ skip: (page - 1) * pageSize, take: pageSize });
    return { ...result, page, pageSize, totalPages: Math.ceil(result.total / pageSize) };
  }
}
