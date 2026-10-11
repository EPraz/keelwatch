import { Body, Controller, Get, Header, Post, UseGuards } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiProperty, ApiTags } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { DemoSessions } from '../application/demo-sessions';
import { Public } from './public.decorator';
import { DemoSessionIssuanceGuard } from './demo-session-issuance.guard';

class DemoSessionRequest {
  @ApiProperty({ enum: ['auditor'] })
  @IsIn(['auditor'])
  role!: 'auditor';
}

class DemoSessionResponse {
  @ApiProperty()
  accessToken!: string;

  @ApiProperty({ format: 'date-time' })
  expiresAt!: string;
}

class DemoAvailabilityResponse {
  @ApiProperty({ type: [String], enum: ['auditor'] })
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
    return { availableRoles: this.sessions.enabled ? ['auditor'] : [] };
  }

  @Post('sessions')
  @UseGuards(DemoSessionIssuanceGuard)
  @Header('Cache-Control', 'no-store')
  @ApiCreatedResponse({ type: DemoSessionResponse })
  issue(@Body() request: DemoSessionRequest): Promise<DemoSessionResponse> {
    return this.sessions.issue(request.role);
  }
}
