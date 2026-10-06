import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
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
import { ComplianceService } from '../application/compliance.service';
import { ComplianceWorkspaceResponseDto } from './compliance-response.dto';
import { CreateCertificateDto } from './create-certificate.dto';

@ApiTags('Compliance')
@ApiBearerAuth()
@Controller({ path: 'vessels/:vesselId', version: '1' })
export class ComplianceController {
  constructor(private readonly compliance: ComplianceService) {}

  @Get('compliance')
  @RequirePermissions('fleet:read')
  @ApiOkResponse({ type: ComplianceWorkspaceResponseDto })
  @ApiUnauthorizedResponse({ description: 'A valid identity is required.' })
  @ApiForbiddenResponse({ description: 'Fleet read permission is required.' })
  @ApiNotFoundResponse({ description: 'The vessel does not exist.' })
  async workspace(
    @Param('vesselId', new ParseUUIDPipe({ version: '4' })) vesselId: string,
  ): Promise<ComplianceWorkspaceResponseDto> {
    return ComplianceWorkspaceResponseDto.from(await this.compliance.workspace(vesselId));
  }

  @Post('certificates')
  @RequirePermissions('fleet:write')
  @ApiCreatedResponse({ type: ComplianceWorkspaceResponseDto })
  @ApiBadRequestResponse({ description: 'The request has field validation errors.' })
  @ApiUnauthorizedResponse({ description: 'A valid identity is required.' })
  @ApiForbiddenResponse({ description: 'Fleet write permission is required.' })
  @ApiNotFoundResponse({ description: 'The vessel does not exist.' })
  @ApiConflictResponse({ description: 'The certificate conflicts with existing data.' })
  async register(
    @Param('vesselId', new ParseUUIDPipe({ version: '4' })) vesselId: string,
    @Body() body: CreateCertificateDto,
    @CurrentActor() actor: AccessActor,
    @CorrelationId() correlationId: string,
  ): Promise<ComplianceWorkspaceResponseDto> {
    return ComplianceWorkspaceResponseDto.from(
      await this.compliance.register({
        vesselId,
        ...body,
        actorUserId: actor.userId,
        correlationId,
      }),
    );
  }

  @Put('certificates/:certificateId')
  @RequirePermissions('fleet:write')
  @ApiOkResponse({ type: ComplianceWorkspaceResponseDto })
  @ApiBadRequestResponse({ description: 'The request has field validation errors.' })
  @ApiUnauthorizedResponse({ description: 'A valid identity is required.' })
  @ApiForbiddenResponse({ description: 'Fleet write permission is required.' })
  @ApiNotFoundResponse({ description: 'The vessel or certificate does not exist.' })
  @ApiConflictResponse({ description: 'The certificate conflicts with existing data.' })
  async update(
    @Param('vesselId', new ParseUUIDPipe({ version: '4' })) vesselId: string,
    @Param('certificateId', new ParseUUIDPipe({ version: '4' })) certificateId: string,
    @Body() body: CreateCertificateDto,
    @CurrentActor() actor: AccessActor,
    @CorrelationId() correlationId: string,
  ): Promise<ComplianceWorkspaceResponseDto> {
    return ComplianceWorkspaceResponseDto.from(
      await this.compliance.update({
        vesselId,
        certificateId,
        ...body,
        actorUserId: actor.userId,
        correlationId,
      }),
    );
  }

  @Post('certificates/:certificateId/archive')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('fleet:write')
  @ApiOkResponse({ type: ComplianceWorkspaceResponseDto })
  @ApiUnauthorizedResponse({ description: 'A valid identity is required.' })
  @ApiForbiddenResponse({ description: 'Fleet write permission is required.' })
  @ApiNotFoundResponse({ description: 'The vessel or certificate does not exist.' })
  @ApiConflictResponse({ description: 'The certificate is already archived.' })
  async archive(
    @Param('vesselId', new ParseUUIDPipe({ version: '4' })) vesselId: string,
    @Param('certificateId', new ParseUUIDPipe({ version: '4' })) certificateId: string,
    @CurrentActor() actor: AccessActor,
    @CorrelationId() correlationId: string,
  ): Promise<ComplianceWorkspaceResponseDto> {
    return ComplianceWorkspaceResponseDto.from(
      await this.compliance.archive({
        vesselId,
        certificateId,
        actorUserId: actor.userId,
        correlationId,
      }),
    );
  }
}
