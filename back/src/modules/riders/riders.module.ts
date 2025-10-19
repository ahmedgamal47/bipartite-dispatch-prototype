import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { RidersController } from './riders.controller'
import { RidersService } from './riders.service'
import { Rider, RiderSchema } from './schemas/rider.schema'

@Module({
  imports: [MongooseModule.forFeature([{ name: Rider.name, schema: RiderSchema }])],
  controllers: [RidersController],
  providers: [RidersService],
  exports: [RidersService],
})
export class RidersModule {}

