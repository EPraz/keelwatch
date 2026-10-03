import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { AccessService, type CurrentUserResponse } from '../application/access.service';
import type { AccessActor } from '../domain/access.types';
import { CurrentActor } from './current-actor.decorator';

@ApiTags('Access')
@ApiBearerAuth()
@Controller({ path: 'access', version: '1' })
export class AccessController {
  constructor(private readonly access: AccessService) {}

  @Get('me')
  @ApiOkResponse({ description: 'The active Keelwatch identity and permissions.' })
  getCurrentUser(@CurrentActor() actor: AccessActor): CurrentUserResponse {
    return this.access.currentUser(actor);
  }
}
