import { map, tap } from 'rxjs';
import { AxiosRequestConfig, AxiosResponse } from 'axios';
import { HttpService } from '@nestjs/axios';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { Processor, Process, OnQueueActive } from '@nestjs/bull';

import { Flight } from './flight.interface';
import { FlightsService } from './flights.service';

@Processor('flight-sources')
export class FlightSourceConsumer {
  private readonly logger = new Logger(FlightSourceConsumer.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly flightService: FlightsService,
  ) {}

  @OnQueueActive()
  onActive(job: Job) {
    this.logger.debug(`Processing job ${job.id}`);
  }

  @Process()
  async fetch(job: Job<Record<string, string>>) {
    const url = job.data.source;
    this.logger.verbose(`Fetching flights for source: ${url}`);

    const requestConfig: AxiosRequestConfig = {
      headers: {
        Accept: 'application/json',
      },
    };
    const observable = this.httpService.get(url, requestConfig).pipe(
      // The transformation is trivial, so we keep it simple here
      // instead of using a custom transformer for different sources.
      map((response: AxiosResponse): Flight[] => response.data.flights),
      tap((flights: Flight[]) =>
        this.logger.debug(`Fetched ${flights.length} flights from ${url}`),
      ),
    );
    observable.subscribe({
      next: (flights: Flight[]) => {
        this.flightService.addFlights(url, flights);
      },
      error: async (error: Error) => {
        await job.moveToFailed({ message: error.toString() }, true);
        this.logger.error(`Error fetching flight from ${url}: ${error}`);
      },
    });
  }
}
