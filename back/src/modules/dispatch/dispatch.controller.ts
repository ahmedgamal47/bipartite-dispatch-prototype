import { Body, Controller, Get, HttpCode, Post, Query } from '@nestjs/common';
import { PoolingService } from './services/pooling.service';
import { TelemetryService } from './services/telemetry.service';

type FlushPayload = {
  h3Index?: string;
};

@Controller('dispatch')
export class DispatchController {
  constructor(
    private readonly poolingService: PoolingService,
    private readonly telemetryService: TelemetryService,
  ) {}

  @Get('pools')
  getPools() {
    return this.poolingService.getPools();
  }

  @Post('pools/flush')
  @HttpCode(200)
  flushPools(@Body() payload: FlushPayload) {
    return this.poolingService.flush(payload.h3Index);
  }

  @Get('telemetry')
  getTelemetry(@Query('limit') limit?: string) {
    const parsedLimit = Number.parseInt(limit ?? '', 10);
    return this.telemetryService.getEvents(
      Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : 50,
    );
  }
}
