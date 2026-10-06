import { Body, Controller, Get, Post, Query } from '@nestjs/common';
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
import { CrewService } from '../application/crew.service';
import {
  CrewMemberResponseDto,
  CrewPageResponseDto,
  CrewQueryDto,
  RegisterCrewDto,
} from './crew.dto';

@ApiTags('Crew')
@ApiBearerAuth()
@Controller({ path: 'crew-members', version: '1' })
export class CrewController {
  constructor(private readonly crew: CrewService) {}

  @Get()
  @RequirePermissions('crew:read')
  @ApiOkResponse({ type: CrewPageResponseDto })
  list(@Query() query: CrewQueryDto) {
    return this.crew.list(query.page);
  }

  @Post()
  @RequirePermissions('crew:write')
  @ApiCreatedResponse({ type: CrewMemberResponseDto })
  register(
    @Body() body: RegisterCrewDto,
    @CurrentActor() actor: AccessActor,
    @CorrelationId() correlationId: string,
  ) {
    return this.crew.register({ ...body, actorUserId: actor.userId, correlationId });
  }
}
