import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../database/prisma.service';
import { Public } from '../access/http/public.decorator';

@ApiTags('Health')
@Public()
@Controller({ path: 'health', version: '1' })
export class HealthController {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('live')
  @ApiOkResponse({ description: 'The API process is alive.' })
  liveness() {
    return { status: 'ok' } as const;
  }

  @Get('ready')
  @ApiOkResponse({ description: 'The API can serve its configured Access store.' })
  async readiness() {
    if (this.config.get<string>('ACCESS_STORE') === 'prisma') {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ready', accessStore: 'postgresql' } as const;
    }
    return { status: 'ready', accessStore: 'memory' } as const;
  }
}
