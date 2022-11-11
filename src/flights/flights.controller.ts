import { Controller, Get } from '@nestjs/common';
import { firstValueFrom, toArray } from 'rxjs';

import { Flight } from './flight.interface';
import { FlightsService } from './flights.service';

@Controller()
export class FlightsController {
  constructor(private readonly flightService: FlightsService) {}

  @Get()
  async getAllFlights(): Promise<Flight[]> {
    // We could theoretically perform a streamed response here.
    // This would be more efficient for very large datasets.
    // I consider that out of scope for this challenge.
    const obs = await firstValueFrom(
      this.flightService.getFlights().pipe(toArray()),
    );
    return obs;
  }
}
