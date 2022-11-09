import { Controller, Get } from '@nestjs/common';

import { Flight } from './flight.interface';
import { FlightsService } from './flights.service';

@Controller()
export class FlightsController {
  constructor(private readonly flightService: FlightsService) {}

  @Get()
  getAllFlights(): Flight[] {
    return this.flightService.getFlights();
  }
}
