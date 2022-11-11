import { BullModule } from '@nestjs/bull';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';

import { FlightsController } from './flights.controller';
import { FlightSourceConsumer } from './flight-source.consumer';
import { FlightsService } from './flights.service';

@Module({
  imports: [
    ConfigModule,
    // TODO: Make this configurable in environment variables.
    BullModule.registerQueue({
      name: 'flight-sources',
      limiter: { max: 10, duration: 1000 }, // 10 fetch jobs per second to avoid stalling the network
    }),
    // TODO: Make this configurable in environment variables.
    // https://docs.nestjs.com/techniques/http-module#async-configuration
    HttpModule.register({
      timeout: 5000,
    }),
  ],
  controllers: [FlightsController],
  providers: [FlightSourceConsumer, FlightsService],
})
export class FlightsModule {}
