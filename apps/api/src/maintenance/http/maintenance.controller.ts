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
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { RequirePermissions } from '../../access/http/require-permissions.decorator';
import { CurrentActor } from '../../access/http/current-actor.decorator';
import type { AccessActor } from '../../access/domain/access.types';
import { CorrelationId } from '../../common/http/correlation-id.decorator';
import { MaintenanceService } from '../application/maintenance.service';
import { MaintenanceHistoryService } from '../application/maintenance-history.service';
import {
  MaintenanceHistoryQueryDto,
  MaintenanceHistoryPageDto,
} from './maintenance-history.dto';
import {
  CreateMaintenanceDto,
  UpdateMaintenanceDto,
  MaintenanceOrderDto,
  MaintenanceQueryDto,
  MaintenancePageDto,
  MaintenanceAssigneePageDto,
  MaintenancePaginationDto,
  TransitionMaintenanceDto,
} from './maintenance.dto';

@ApiTags('Maintenance')
@ApiBearerAuth()
@Controller({ path: 'vessels/:vesselId/maintenance-orders', version: '1' })
export class MaintenanceController {
  constructor(
    private readonly maintenance: MaintenanceService,
    private readonly history: MaintenanceHistoryService,
  ) {}
  @Get(':orderId/history')
  @RequirePermissions('maintenance:read', 'fleet:read', 'activity:read')
  @ApiOkResponse({ type: MaintenanceHistoryPageDto })
  orderHistory(
    @Param('vesselId', new ParseUUIDPipe()) vesselId: string,
    @Param('orderId', new ParseUUIDPipe()) orderId: string,
    @Query() query: MaintenanceHistoryQueryDto,
  ) {
    return this.history.list(vesselId, orderId, query.cursor);
  }
  @Post(':orderId/transitions')
  @RequirePermissions('maintenance:read', 'maintenance:write', 'fleet:read')
  @ApiCreatedResponse({ type: MaintenanceOrderDto })
  transition(
    @Param('vesselId', new ParseUUIDPipe()) vesselId: string,
    @Param('orderId', new ParseUUIDPipe()) orderId: string,
    @Body() body: TransitionMaintenanceDto,
    @CurrentActor() actor: AccessActor,
    @CorrelationId() correlationId: string,
  ) {
    return this.maintenance.transition(
      vesselId,
      orderId,
      body,
      actor.userId,
      correlationId,
    );
  }
  @Get('assignees')
  @RequirePermissions('maintenance:write', 'fleet:read')
  @ApiOkResponse({ type: MaintenanceAssigneePageDto })
  eligibleAssignees(
    @Param('vesselId', new ParseUUIDPipe()) vesselId: string,
    @Query() query: MaintenancePaginationDto,
  ) {
    return this.maintenance.eligibleAssignees(vesselId, query.page);
  }
  @Get()
  @RequirePermissions('maintenance:read', 'fleet:read')
  @ApiOkResponse({ type: MaintenancePageDto })
  list(
    @Param('vesselId', new ParseUUIDPipe()) vesselId: string,
    @Query() query: MaintenanceQueryDto,
  ) {
    return this.maintenance.list(vesselId, query);
  }
  @Put(':orderId')
  @RequirePermissions('maintenance:read', 'maintenance:write', 'fleet:read')
  @ApiOkResponse({ type: MaintenanceOrderDto })
  update(
    @Param('vesselId', new ParseUUIDPipe()) vesselId: string,
    @Param('orderId', new ParseUUIDPipe()) orderId: string,
    @Body() body: UpdateMaintenanceDto,
    @CurrentActor() actor: AccessActor,
    @CorrelationId() correlationId: string,
  ) {
    return this.maintenance.update(vesselId, orderId, body, actor.userId, correlationId);
  }
  @Get(':orderId')
  @RequirePermissions('maintenance:read', 'fleet:read')
  @ApiOkResponse({ type: MaintenanceOrderDto })
  detail(
    @Param('vesselId', new ParseUUIDPipe()) vesselId: string,
    @Param('orderId', new ParseUUIDPipe()) orderId: string,
  ) {
    return this.maintenance.detail(vesselId, orderId);
  }
  @Post()
  @RequirePermissions('maintenance:read', 'maintenance:write', 'fleet:read')
  @ApiCreatedResponse({ type: MaintenanceOrderDto })
  create(
    @Param('vesselId', new ParseUUIDPipe()) vesselId: string,
    @Body() body: CreateMaintenanceDto,
    @CurrentActor() actor: AccessActor,
    @CorrelationId() correlationId: string,
  ) {
    return this.maintenance.create(vesselId, body, actor.userId, correlationId);
  }
}
