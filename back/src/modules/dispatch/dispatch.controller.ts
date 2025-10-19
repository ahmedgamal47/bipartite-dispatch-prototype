import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common'
import { PoolingService } from './services/pooling.service'
import { TelemetryService } from './services/telemetry.service'

type FlushPayload = {
  h3Index?: string
}

@Controller('dispatch')
export class DispatchController {
  constructor(
    private readonly poolingService: PoolingService,
    private readonly telemetryService: TelemetryService,
  ) {}

  @Get('pools')
  getPools() {
    return this.poolingService.getPools()
  }

  @Post('pools/flush')
  @HttpCode(200)
  flushPools(@Body() payload: FlushPayload) {
    return this.poolingService.flush(payload.h3Index)
  }

  @Get('telemetry')
  getTelemetry() {
    return this.telemetryService.getEvents()
  }
}

