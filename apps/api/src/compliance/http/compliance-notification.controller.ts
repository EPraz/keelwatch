import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import {
  ApiAcceptedResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { AccessActor } from '../../access/domain/access.types';
import { CurrentActor } from '../../access/http/current-actor.decorator';
import { RequirePermissions } from '../../access/http/require-permissions.decorator';
import { NotificationJobService } from '../application/notification-job.service';
import {
  NotificationJobRunResponseDto,
  NotificationWatchResponseDto,
} from './notification-response.dto';

@ApiTags('Compliance')
@ApiBearerAuth()
@Controller({ path: 'compliance', version: '1' })
export class ComplianceNotificationController {
  constructor(private readonly notifications: NotificationJobService) {}

  @Get('notifications')
  @RequirePermissions('fleet:read')
  @ApiOkResponse({ type: NotificationWatchResponseDto })
  @ApiUnauthorizedResponse({ description: 'A valid identity is required.' })
  @ApiForbiddenResponse({ description: 'Fleet read permission is required.' })
  async watch(): Promise<NotificationWatchResponseDto> {
    return NotificationWatchResponseDto.from(await this.notifications.watch());
  }

  @Post('notification-jobs')
  @HttpCode(HttpStatus.ACCEPTED)
  @RequirePermissions('fleet:write')
  @ApiAcceptedResponse({ type: NotificationJobRunResponseDto })
  @ApiUnauthorizedResponse({ description: 'A valid identity is required.' })
  @ApiForbiddenResponse({ description: 'Fleet write permission is required.' })
  async enqueue(
    @CurrentActor() actor: AccessActor,
  ): Promise<NotificationJobRunResponseDto> {
    return NotificationJobRunResponseDto.from(
      await this.notifications.enqueue(actor.userId),
    );
  }

  @Get('notification-jobs/:jobRunId')
  @RequirePermissions('fleet:read')
  @ApiOkResponse({ type: NotificationJobRunResponseDto })
  @ApiUnauthorizedResponse({ description: 'A valid identity is required.' })
  @ApiForbiddenResponse({ description: 'Fleet read permission is required.' })
  @ApiNotFoundResponse({ description: 'The notification job does not exist.' })
  async run(
    @Param('jobRunId', new ParseUUIDPipe({ version: '4' })) jobRunId: string,
  ): Promise<NotificationJobRunResponseDto> {
    return NotificationJobRunResponseDto.from(await this.notifications.findRun(jobRunId));
  }
}
