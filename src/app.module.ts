import { BullModule } from '@nestjs/bull';
import { ConfigModule } from '@nestjs/config';
import { ConfigService } from '@nestjs/config';
import { Module } from '@nestjs/common';
import * as Joi from '@hapi/joi';

import { FlightsModule } from './flights/flights.module';

@Module({
  imports: [
    // Use Bull for scheduling and queuing of jobs.
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        redis: {
          host: configService.get('REDIS_HOST'),
          port: configService.get('REDIS_PORT'),
        },
      }),
    }),
    // Do some basic validation of the environment variables.
    ConfigModule.forRoot({
      validationSchema: Joi.object({
        PORT: Joi.number().required(),
        REDIS_HOST: Joi.string().required(),
        REDIS_PORT: Joi.number().required(),
        FLIGHTS_CACHE_TTL_S: Joi.number(),
        SOURCES_FETCH_INTERVAL_MS: Joi.number(),
        SOURCES_FETCH_CONCURRENCY: Joi.number(),
        SOURCES_FETCH_ATTEMPTS: Joi.number(),
        SOURCES_FETCH_BACKOFF_MS: Joi.number(),
        JOB_LIMIT_PER_SECOND: Joi.number(),
      }),
    }),
    FlightsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
