import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { OffersController } from './offers.controller'
import { OffersService } from './offers.service'
import { Offer, OfferSchema } from './schemas/offer.schema'
import { Trip, TripSchema } from '../trips/schemas/trip.schema'
import { Driver, DriverSchema } from '../drivers/schemas/driver.schema'
import { TelemetryService } from '../dispatch/services/telemetry.service'

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Offer.name, schema: OfferSchema },
      { name: Trip.name, schema: TripSchema },
      { name: Driver.name, schema: DriverSchema },
    ]),
  ],
  controllers: [OffersController],
  providers: [OffersService],
  exports: [OffersService],
})
export class OffersModule {}
