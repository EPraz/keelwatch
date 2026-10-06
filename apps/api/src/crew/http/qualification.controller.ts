import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { AccessActor } from '../../access/domain/access.types';
import { CurrentActor } from '../../access/http/current-actor.decorator';
import { RequirePermissions } from '../../access/http/require-permissions.decorator';
import { CorrelationId } from '../../common/http/correlation-id.decorator';
import { QualificationService } from '../application/qualification.service';
import { CrewQueryDto } from './crew.dto';
import {
  QualificationResponseDto,
  QualificationWorkspaceDto,
  RecordQualificationDto,
} from './qualification.dto';

@ApiTags('Crew')
@ApiBearerAuth()
@Controller({ path: 'crew-members/:crewMemberId/qualifications', version: '1' })
export class QualificationController {
  constructor(private readonly qualifications: QualificationService) {}

  @Get()
  @RequirePermissions('crew:read')
  @ApiOkResponse({ type: QualificationWorkspaceDto })
  list(
    @Param('crewMemberId', new ParseUUIDPipe()) crewMemberId: string,
    @Query() query: CrewQueryDto,
  ) {
    return this.qualifications.workspace(crewMemberId, query.page);
  }

  @Post()
  @RequirePermissions('crew:write')
  @ApiCreatedResponse({ type: QualificationResponseDto })
  record(
    @Param('crewMemberId', new ParseUUIDPipe()) crewMemberId: string,
    @Body() body: RecordQualificationDto,
    @CurrentActor() actor: AccessActor,
    @CorrelationId() correlationId: string,
  ) {
    return this.qualifications.record({
      ...body,
      crewMemberId,
      actorUserId: actor.userId,
      correlationId,
    });
  }
}
