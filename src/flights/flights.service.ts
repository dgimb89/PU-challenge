import { ConfigService } from '@nestjs/config';
import { from, map, mergeMap, Observable, tap } from 'rxjs';
import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { serialize, deserialize } from 'v8';
import { Queue } from 'bull';
import Redis from 'ioredis';

import { Flight } from './flight.interface';

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
  ) {}

  onModuleInit() {
    // TODO: Redis doesn't work on reload.
    // We use Redis for explicit caching of flights data.
    // Not to be confused with the usage as NestJS CacheModule
    this.redis = new Redis({
      host: this.configService.get('REDIS_HOST'),
      port: this.configService.get('REDIS_PORT'),
    });

    this.ttl =
      this.configService.get('FLIGHTS_CACHE_TTL_S') || DEFAULT_REDIS_TTL;

    // TODO: This is not working
    // Clear redis cache on startup.
    this.redis.del(this.redisCacheKeyExpression()).then((number) => {
      this.logger.log(`Cleared ${number} keys from Redis`);
    });
    this.produceFetchJobs(this.flightSourcesQueue);
  }

  // Produce repeating jobs for fetching flight data from sources.
  async produceFetchJobs(flightSourcesQueue: Queue) {
    // Empty the queue before adding new jobs.
    await flightSourcesQueue.empty();

    // Retry failed jobs immediately with exponential backoff.
    const sharedConfig = {
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
    // Repeating job to continuously fetch flight data.
    const repeatConfig = Object.assign(
      {
        repeat: {
          every:
            this.configService.get('SOURCES_FETCH_INTERVAL_MS') ||
            DEFAULT_SOURCES_FETCH_INTERVAL,
        },
      },
      sharedConfig,
    );

    // One repeating job for each source
    for (const [index, source] of SOURCES.entries()) {
      // TODO: Separate job scheduling?
      // Unfortunately, it is not possible to run repeating jobs immediately.
      // See https://github.com/OptimalBits/bull/issues/1239
      // Therefore, we need to schedule a another non-repeating job per source to fetch flight data immediately.
      const immediateJob = await flightSourcesQueue.add(
        { source },
        Object.assign({ jobId: `immediate_${index}` }, sharedConfig),
      );
      this.logger.log(`Added job ${immediateJob.id} for source ${source}`);

      const repeatingJob = await flightSourcesQueue.add(
        { source },
        Object.assign({ jobId: `repeat_${index}` }, repeatConfig),
      );
      this.logger.log(`Added job ${repeatingJob.id} for source ${source}`);
    }
  }

  addFlights(fromSource: string, flights: Flight[]) {
    // TODO: Move key generation to model
    // TODO: Remove keys that were removed from source
    flights.forEach((flight) => {
      const key = `${CACHE_PREFIX}:${flight.slices[0].flight_number}-${flight.slices[1].flight_number}`;
      this.redis.set(key, serialize(flight), 'EX', this.ttl);
    });
  }

  getFlights(): Observable<Flight> {
    const keysPromise = this.redis.keys(this.redisCacheKeyExpression());
    const observable$ = from(keysPromise).pipe(
      tap((keys) =>
        this.logger.debug(`Fetching flights with the following keys: ${keys}`),
      ),
      mergeMap((key) => key),
      map((key) => this.redis.getBuffer(key)),
      mergeMap((buffer) => buffer),
      map((buffer) => deserialize(buffer)),
    );
    return observable$;
  }

  // TODO: rename
  private redisCacheKeyExpression() {
    return `${CACHE_PREFIX}:*`;
  }
}
