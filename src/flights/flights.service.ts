import { ConfigService } from '@nestjs/config';
import { from, map, mergeMap, Observable, tap } from 'rxjs';
import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { serialize, deserialize } from 'v8';
import { JobOptions, Queue } from 'bull';
import Redis from 'ioredis';

import { Flight, getFlightIdentifier } from './flight.interface';

const SOURCES = [
  'https://coding-challenge.powerus.de/flight/source1',
  'https://coding-challenge.powerus.de/flight/source2',
];

const DEFAULT_REDIS_TTL = 60 * 60; // default: 1 hour
const DEFAULT_SOURCES_FETCH_INTERVAL = 60 * 1000; // 1 minute
const DEFAULT_SOURCES_FETCH_BACKOFF_MS = 1000; // 1 second
const DEFAULT_SOURCES_FETCH_ATTEMPTS = 3;
const CACHE_PREFIX = 'flights';

@Injectable()
export class FlightsService {
  private redis: Redis;
  private ttl: number;
  private readonly logger = new Logger(FlightsService.name);

  constructor(
    private configService: ConfigService,
    @InjectQueue('flight-sources') private flightSourcesQueue: Queue,
  ) {
    // Besides Job Queuing we use Redis as data store for expiring flights data.
    // Not to be confused with the usage as NestJS CacheModule
    this.redis = new Redis({
      host: this.configService.get('REDIS_HOST'),
      port: this.configService.get('REDIS_PORT'),
    });

    this.ttl =
      this.configService.get('FLIGHTS_CACHE_TTL_S') || DEFAULT_REDIS_TTL;

    this.produceFetchJobs();
  }

  // Produce repeating jobs for fetching flight data from sources.
  async produceFetchJobs() {
    // Empty the queue before adding new jobs.
    await this.cleanJobQueue();

    for (const [index, source] of SOURCES.entries()) {
      // Unfortunately, it is not possible to run repeating jobs immediately.
      // See https://github.com/OptimalBits/bull/issues/1239
      // Therefore, we need to schedule a non-repeating job per source to fetch flight data immediately.
      const immediateJob = await this.flightSourcesQueue.add(
        { source },
        this.generateJobConfiguration(index),
      );
      this.logger.log(`Added job ${immediateJob.id} for source ${source}`);

      // One repeating job for each source to continuously fetch flight data.
      const repeatingJob = await this.flightSourcesQueue.add(
        { source },
        this.generateJobConfiguration(index, true),
      );
      this.logger.log(`Added job ${repeatingJob.id} for source ${source}`);
    }
  }

  private async cleanJobQueue() {
    // Bull does not provide a convenient way to remove all jobs from a queue (esp. repeating ones).
    // So we have to do it manually.
    // Inspired by https://github.com/OptimalBits/bull/issues/709#issuecomment-344561983
    const multi = this.flightSourcesQueue.multi();
    multi.del(this.flightSourcesQueue.toKey('repeat'));
    multi.exec();

    await Promise.all([
      this.flightSourcesQueue.clean(0, 'delayed'),
      this.flightSourcesQueue.clean(0, 'wait'),
      this.flightSourcesQueue.clean(0, 'active'),
      this.flightSourcesQueue.clean(0, 'completed'),
      this.flightSourcesQueue.clean(0, 'failed'),
      multi.exec(),
    ]);
  }

  generateJobConfiguration(sourceIndex: number, repeating = false): JobOptions {
    const jobConfig: JobOptions = {
      jobId: sourceIndex,
      attempts:
        this.configService.get('SOURCES_FETCH_ATTEMPTS') ||
        DEFAULT_SOURCES_FETCH_ATTEMPTS,
      backoff: {
        type: 'exponential',
        delay:
          this.configService.get('SOURCES_FETCH_BACKOFF_MS') ||
          DEFAULT_SOURCES_FETCH_BACKOFF_MS,
      },
    };

    if (repeating) {
      // Retry failed jobs immediately with exponential backoff.
      jobConfig.repeat = {
        every:
          this.configService.get('SOURCES_FETCH_INTERVAL_MS') ||
          DEFAULT_SOURCES_FETCH_INTERVAL,
      };
    }
    return jobConfig;
  }

  addFlights(fromSource: string, flights: Flight[]) {
    // TODO: Remove keys that were removed from source?
    // Need some clarification on how to interpret the specification:
    // "any information that we get from the endpoints remains valid for an hour."
    // Does this mean that we shouldn't remove flights that are not present in the source anymore?
    flights.forEach((flight) => {
      const key = this.getRedisKeyForFlight(flight);
      this.redis.set(key, serialize(flight), 'EX', this.ttl);
    });
  }

  private getRedisKeyForFlight(flight: Flight) {
    return `${CACHE_PREFIX}:${getFlightIdentifier(flight)}`;
  }

  private redisFlightStoreKeyExpression() {
    return `${CACHE_PREFIX}:*`;
  }

  getFlights(): Observable<Flight> {
    const keysPromise = this.redis.keys(this.redisFlightStoreKeyExpression());
    const observable$ = from(keysPromise).pipe(
      tap((keys: string[]) => this.logger.debug(`Read ${keys.length} flights`)),
      mergeMap((key: string[]) => key),
      map((key: string) => this.redis.getBuffer(key)),
      mergeMap((buffer: Promise<Buffer>) => buffer),
      map((buffer: Buffer) => deserialize(buffer)),
    );
    return observable$;
  }
}
