import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';

import { FlightsController } from './flights.controller';
import { FlightSourceConsumer } from './flight-source.consumer';
import { FlightsService } from './flights.service';

const DEFAULT_JOB_LIMIT_PER_SECOND = 10;

@Module({
  imports: [
    ConfigModule,
    BullModule.registerQueueAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        name: 'flight-sources',
        // limit jobs per second to avoid stalling the network
        limiter: {
          max:
            configService.get('JOB_LIMIT_PER_SECOND') ||
            DEFAULT_JOB_LIMIT_PER_SECOND,
          duration: 1000,
        },
      }),
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
