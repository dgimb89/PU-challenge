import { BullModule } from '@nestjs/bull';
import { ConfigModule } from '@nestjs/config';
import { Module } from '@nestjs/common';

import { FlightsController } from './flights.controller';
import { FlightSourceConsumer } from './flight-source.consumer';
import { FlightsService } from './flights.service';

@Module({
  imports: [
    ConfigModule,
    BullModule.registerQueue({
      name: 'flight-sources',
      limiter: { max: 10, duration: 1000 }, // 10 fetch jobs per second to avoid stalling the network
    }),
  ],
  controllers: [FlightsController],
  providers: [FlightSourceConsumer, FlightsService],
})
export class FlightsModule {}
