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
import { AssignmentService } from '../application/assignment.service';
import {
  CreateAssignmentDto,
  CancelAssignmentDto,
  AssignmentResponseDto,
  AssignmentWorkspaceDto,
} from './assignment.dto';
import { CrewQueryDto } from './crew.dto';

@ApiTags('Crew')
@ApiBearerAuth()
@Controller({ path: 'vessels/:vesselId/crew-assignments', version: '1' })
export class AssignmentController {
  constructor(private readonly assignments: AssignmentService) {}
  @Get()
  @RequirePermissions('crew:read', 'fleet:read')
  @ApiOkResponse({ type: AssignmentWorkspaceDto })
  list(
    @Param('vesselId', new ParseUUIDPipe()) vesselId: string,
    @Query() query: CrewQueryDto,
  ) {
    return this.assignments.workspace(vesselId, query.page);
  }
  @Post()
  @RequirePermissions('crew:write', 'fleet:read')
  @ApiCreatedResponse({ type: AssignmentResponseDto })
  create(
    @Param('vesselId', new ParseUUIDPipe()) vesselId: string,
    @Body() body: CreateAssignmentDto,
    @CurrentActor() actor: AccessActor,
    @CorrelationId() correlationId: string,
  ) {
    return this.assignments.create({
      ...body,
      vesselId,
      actorUserId: actor.userId,
      correlationId,
    });
  }
  @Post(':assignmentId/cancellation')
  @RequirePermissions('crew:write', 'fleet:read')
  @ApiCreatedResponse({ type: AssignmentResponseDto })
  cancel(
    @Param('vesselId', new ParseUUIDPipe()) vesselId: string,
    @Param('assignmentId', new ParseUUIDPipe()) assignmentId: string,
    @Body() body: CancelAssignmentDto,
    @CurrentActor() actor: AccessActor,
    @CorrelationId() correlationId: string,
  ) {
    return this.assignments.cancel({
      vesselId,
      assignmentId,
      reason: body.reason,
      actorUserId: actor.userId,
      correlationId,
    });
  }
}
