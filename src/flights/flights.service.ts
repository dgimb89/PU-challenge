import { ConfigService } from '@nestjs/config';
import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import Redis from 'ioredis';

import { Flight } from './flight.interface';

const SOURCES = [
  'https://coding-challenge.powerus.de/flight/source1',
  'https://coding-challenge.powerus.de/flight/source2',
];

@Injectable()
export class FlightsService {
  private redis: Redis;
  private ttl: number;

  constructor(
    private configService: ConfigService,
    @InjectQueue('flight-sources') flightSourcesQueue: Queue,
  ) {
    // We use Redis for explicit caching of flights data.
    // Not to be confused with the usage as NestJS CacheModule
    this.redis = new Redis({
      host: configService.get('REDIS_HOST'),
      port: configService.get('REDIS_PORT'),
    });

    this.ttl = configService.get('FLIGHTS_CACHE_TTL_S') || 60 * 60; // default: 1 hour

    this.produceFetchJobs(flightSourcesQueue);
  }

  // Produce repeating jobs for fetching flight data from sources.
  async produceFetchJobs(flightSourcesQueue: Queue) {
    // Empty the queue before adding new jobs.
    await flightSourcesQueue.empty();

    // One Job for each source
    SOURCES.forEach(async (source, index) => {
      // Config: attempts, exponential backoff on fail?
      const config = {
        repeat: {
          every:
            this.configService.get('SOURCES_FETCH_INTERVAL_MS') || 10 * 1000, // 1 minute
        },
        jobId: index,
      };
      const job = await flightSourcesQueue.add({ source: source }, config);
      console.log(`Added job ${job.id} for source ${source}`);
    });
  }

  getFlights(): Flight[] {
    // this.redis
    //   .get(FLIGHTS_KEY)
    //   .then((flights) => console.log(flights))
    //   .then(() =>
    //     this.redis.set(FLIGHTS_KEY, JSON.stringify(SOURCES), 'EX', this.ttl),
    //   );

    // TODO: Get flights from Redis.
    return [];
  }
}
