import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';

import { FlightsController } from './flights.controller';
import { FlightSourceConsumer } from './flight-source.consumer';
import { FlightsService } from './flights.service';

const DEFAULT_JOB_LIMIT_PER_SECOND = 10;
const DEFAULT_SOURCES_FETCH_TIMEOUT_MS = 5000; // 5 seconds

@Module({
  imports: [
    ConfigModule,
    BullModule.registerQueueAsync({
      name: 'flight-sources',
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        // limit jobs per second to avoid stalling the network
        limiter: {
          max:
            configService.get('JOB_LIMIT_PER_SECOND') ||
            DEFAULT_JOB_LIMIT_PER_SECOND,
          duration: 1000,
        },
      }),
    }),
    HttpModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        timeout:
          configService.get('SOURCES_FETCH_TIMEOUT_MS') ||
          DEFAULT_SOURCES_FETCH_TIMEOUT_MS,
      }),
    }),
  ],
  controllers: [FlightsController],
  providers: [FlightSourceConsumer, FlightsService],
})
export class FlightsModule {}
