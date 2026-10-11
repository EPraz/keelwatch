import { Body, Controller, Get, Header, Post, UseGuards } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiProperty, ApiTags } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { DemoSessions } from '../application/demo-sessions';
import { Public } from './public.decorator';
import { DemoSessionIssuanceGuard } from './demo-session-issuance.guard';
import { DEMO_ROLES, type DemoRole } from '../domain/demo-account';

class DemoSessionRequest {
  @ApiProperty({ enum: DEMO_ROLES })
  @IsIn(DEMO_ROLES)
  role!: DemoRole;
}

class DemoSessionResponse {
  @ApiProperty()
  accessToken!: string;

  @ApiProperty({ format: 'date-time' })
  expiresAt!: string;
}

class DemoAvailabilityResponse {
  @ApiProperty({ type: [String], enum: DEMO_ROLES })
  availableRoles!: string[];
}

@ApiTags('Access')
@Public()
@Controller({ path: 'access/demo', version: '1' })
export class DemoAccessController {
  constructor(private readonly sessions: DemoSessions) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  @ApiOkResponse({ type: DemoAvailabilityResponse })
  availability(): DemoAvailabilityResponse {
    return { availableRoles: this.sessions.enabled ? [...DEMO_ROLES] : [] };
  }

  @Post('sessions')
  @UseGuards(DemoSessionIssuanceGuard)
  @Header('Cache-Control', 'no-store')
  @ApiCreatedResponse({ type: DemoSessionResponse })
  issue(@Body() request: DemoSessionRequest): Promise<DemoSessionResponse> {
    return this.sessions.issue(request.role);
  }
}
