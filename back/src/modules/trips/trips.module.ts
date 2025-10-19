import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { TripsController } from './trips.controller'
import { TripsService } from './trips.service'
import { Trip, TripSchema } from './schemas/trip.schema'
import { Rider, RiderSchema } from '../riders/schemas/rider.schema'
import { DispatchModule } from '../dispatch/dispatch.module'
import { OffersModule } from '../offers/offers.module'

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Trip.name, schema: TripSchema },
      { name: Rider.name, schema: RiderSchema },
    ]),
    DispatchModule,
    OffersModule,
  ],
  controllers: [TripsController],
  providers: [TripsService],
  exports: [TripsService],
})
export class TripsModule {}
