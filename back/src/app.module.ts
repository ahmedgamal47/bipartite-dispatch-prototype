import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { MongooseModule } from '@nestjs/mongoose'
import { CommonModule } from './common/common.module'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { DriversModule } from './modules/drivers/drivers.module'
import { MapsModule } from './modules/maps/maps.module'
import { RidersModule } from './modules/riders/riders.module'
import { TripsModule } from './modules/trips/trips.module'
import { OffersModule } from './modules/offers/offers.module'
import { DispatchModule } from './modules/dispatch/dispatch.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('MONGODB_URI', 'mongodb://localhost:27017/dispatch_poc'),
      }),
    }),
    CommonModule,
    DriversModule,
    MapsModule,
    RidersModule,
    DispatchModule,
    OffersModule,
    TripsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
