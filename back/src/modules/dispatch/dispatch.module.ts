import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { DispatchController } from './dispatch.controller'
import { PoolingService } from './services/pooling.service'
import { MatchingService } from './services/matching.service'
import { TelemetryService } from './services/telemetry.service'
import { Driver, DriverSchema } from '../drivers/schemas/driver.schema'

@Module({
  imports: [MongooseModule.forFeature([{ name: Driver.name, schema: DriverSchema }])],
  providers: [PoolingService, MatchingService, TelemetryService],
  controllers: [DispatchController],
  exports: [PoolingService, MatchingService, TelemetryService],
})
export class DispatchModule {}
