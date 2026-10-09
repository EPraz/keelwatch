import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../../access/http/require-permissions.decorator';
import { CompositionService } from '../application/composition.service';
import { CompositionPageDto, CompositionQueryDto } from './composition.dto';

@ApiTags('Crew')
@ApiBearerAuth()
@Controller({ path: 'vessels/:vesselId/crew-composition', version: '1' })
export class CompositionController {
  constructor(private readonly composition: CompositionService) {}
  @Get()
  @RequirePermissions('crew:read', 'fleet:read')
  @ApiOkResponse({
    type: CompositionPageDto,
    description:
      'Synthetic plans containing the selected day, with full-plan advisory coverage from currently registered qualifications. Performs no writes.',
  })
  consult(
    @Param('vesselId', new ParseUUIDPipe()) vesselId: string,
    @Query() query: CompositionQueryDto,
  ) {
    return this.composition.consult(vesselId, query);
  }
}
