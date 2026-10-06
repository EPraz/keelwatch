import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { RequirePermissions } from '../../access/http/require-permissions.decorator';
import { ComplianceQueueService } from '../application/compliance-queue.service';
import { ComplianceQueueResponseDto } from './compliance-queue-response.dto';
import { ListComplianceQueryDto } from './list-compliance-query.dto';

@ApiTags('Compliance')
@ApiBearerAuth()
@Controller({ path: 'compliance', version: '1' })
export class ComplianceQueueController {
  constructor(private readonly complianceQueue: ComplianceQueueService) {}

  @Get()
  @RequirePermissions('fleet:read')
  @ApiOkResponse({ type: ComplianceQueueResponseDto })
  @ApiBadRequestResponse({ description: 'The query contains invalid filters.' })
  @ApiUnauthorizedResponse({ description: 'A valid identity is required.' })
  @ApiForbiddenResponse({ description: 'Fleet read permission is required.' })
  async list(
    @Query() query: ListComplianceQueryDto,
  ): Promise<ComplianceQueueResponseDto> {
    return ComplianceQueueResponseDto.from(await this.complianceQueue.list(query));
  }
}
