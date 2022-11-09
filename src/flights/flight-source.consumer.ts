import { Job } from 'bull';
import { Processor, Process, OnQueueActive } from '@nestjs/bull';

const FLIGHTS_KEY = 'flights';

@Processor('flight-sources')
export class FlightSourceConsumer {
  @OnQueueActive()
  onActive(job: Job) {
    console.log(`Processing job ${job.id} of type ${job.name}`);
  }

  @Process()
  fetch(job: Job<unknown>) {
    console.log('fetching', job.data);
  }
}
