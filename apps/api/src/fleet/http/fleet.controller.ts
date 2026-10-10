import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { AccessActor } from '../../access/domain/access.types';
import { CurrentActor } from '../../access/http/current-actor.decorator';
import { RequirePermissions } from '../../access/http/require-permissions.decorator';
import { CorrelationId } from '../../common/http/correlation-id.decorator';
import { FleetService } from '../application/fleet.service';
import { CreateVesselDto } from './create-vessel.dto';
import { ListVesselsQueryDto } from './list-vessels-query.dto';
import { UpdateVesselDto } from './update-vessel.dto';
import {
  VesselDetailResponseDto,
  VesselListResponseDto,
  VesselResponseDto,
} from './vessel-response.dto';

@ApiTags('Fleet')
@ApiBearerAuth()
@Controller({ path: 'vessels', version: '1' })
export class FleetController {
  constructor(private readonly fleet: FleetService) {}

  @Get()
  @RequirePermissions('fleet:read')
  @ApiOkResponse({ type: VesselListResponseDto })
  @ApiUnauthorizedResponse({ description: 'A valid identity is required.' })
  @ApiForbiddenResponse({ description: 'Fleet read permission is required.' })
  async list(@Query() query: ListVesselsQueryDto): Promise<VesselListResponseDto> {
    return VesselListResponseDto.from(await this.fleet.list(query));
  }

  @Get(':vesselId')
  @RequirePermissions('fleet:read')
  @ApiOkResponse({ type: VesselDetailResponseDto })
  @ApiUnauthorizedResponse({ description: 'A valid identity is required.' })
  @ApiForbiddenResponse({ description: 'Fleet read permission is required.' })
  @ApiNotFoundResponse({ description: 'The vessel does not exist.' })
  async detail(
    @Param('vesselId', new ParseUUIDPipe({ version: '4' })) vesselId: string,
    @CurrentActor() actor: AccessActor,
  ): Promise<VesselDetailResponseDto> {
    return VesselDetailResponseDto.from(
      await this.fleet.findById(
        vesselId,
        actor.permissions.includes('maintenance:read') &&
          actor.permissions.includes('activity:read'),
      ),
    );
  }

  @Post()
  @RequirePermissions('fleet:write')
  @ApiCreatedResponse({ type: VesselResponseDto })
  @ApiBadRequestResponse({ description: 'The request has field validation errors.' })
  @ApiUnauthorizedResponse({ description: 'A valid identity is required.' })
  @ApiForbiddenResponse({ description: 'Fleet write permission is required.' })
  @ApiConflictResponse({ description: 'The registry number already exists.' })
  async register(
    @Body() body: CreateVesselDto,
    @CurrentActor() actor: AccessActor,
    @CorrelationId() correlationId: string,
  ): Promise<VesselResponseDto> {
    const vessel = await this.fleet.register({
      ...body,
      actorUserId: actor.userId,
      correlationId,
    });
    return VesselResponseDto.from(vessel);
  }

  @Put(':vesselId')
  @RequirePermissions('fleet:write')
  @ApiOkResponse({ type: VesselResponseDto })
  @ApiBadRequestResponse({ description: 'The request has field validation errors.' })
  @ApiUnauthorizedResponse({ description: 'A valid identity is required.' })
  @ApiForbiddenResponse({ description: 'Fleet write permission is required.' })
  @ApiNotFoundResponse({ description: 'The vessel does not exist.' })
  @ApiConflictResponse({ description: 'The registry number already exists.' })
  async update(
    @Param('vesselId', new ParseUUIDPipe({ version: '4' })) vesselId: string,
    @Body() body: UpdateVesselDto,
    @CurrentActor() actor: AccessActor,
    @CorrelationId() correlationId: string,
  ): Promise<VesselResponseDto> {
    const vessel = await this.fleet.update({
      id: vesselId,
      ...body,
      actorUserId: actor.userId,
      correlationId,
    });
    return VesselResponseDto.from(vessel);
  }
}
