import { Test, TestingModule } from '@nestjs/testing';

import { FlightMock } from './flight.interface.spec';
import { FlightsController } from './flights.controller';
import { FlightsService } from './flights.service';
import { FlightsServiceMock } from './flights.service.spec';

describe('FlightsController', () => {
  let controller: FlightsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FlightsController],
      providers: [
        {
          provide: FlightsService,
          useClass: FlightsServiceMock,
        },
      ],
    }).compile();

    controller = module.get<FlightsController>(FlightsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return all flights', async () => {
    const flights = await controller.getAllFlights();
    expect(flights).toHaveLength(2);
    expect(flights).toContain(FlightMock.flight);
    expect(flights).toContain(FlightMock.anotherFlight);
  });
});
