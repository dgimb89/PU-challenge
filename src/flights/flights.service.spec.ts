import { BullModule, getQueueToken } from '@nestjs/bull';
import { ConfigService } from '@nestjs/config';
import { createSandbox } from 'sinon';
import { mock } from 'jest-mock-extended';
import { of } from 'rxjs';
import { Queue } from 'bull';
import { Test, TestingModule } from '@nestjs/testing';
import Redis from 'ioredis';

import { FlightMock } from './flight.interface.spec';
import { FlightsService } from './flights.service';

// Mocks
export class FlightsServiceMock {
  getFlights() {
    return of(FlightMock.flight, FlightMock.anotherFlight);
  }

  addFlights() {
    // NOOP
  }
}

describe('FlightsService', () => {
  let service: FlightsService;
  let queue: Queue;

  beforeAll(() => {
    // stub Redis connection
    const sandbox = createSandbox();
    sandbox.stub(Redis.prototype, 'connect').returns(Promise.resolve());
    sandbox.stub(Redis.prototype, 'sendCommand').returns(Promise.resolve());
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [BullModule.registerQueue({ name: FlightsService.name })],
      providers: [FlightsService, ConfigService],
    })
      .overrideProvider(getQueueToken(FlightsService.name))
      .useValue(mock())
      .compile();

    service = module.get<FlightsService>(FlightsService);
    service.cleanJobQueue = jest.fn(() => Promise.resolve());
    queue = module.get<Queue>(getQueueToken(FlightsService.name));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should clean job queue on init', async () => {
    service.produceFetchJobs = jest.fn();
    const spy = jest.spyOn(service, 'cleanJobQueue');

    await service.onModuleInit();
    expect(spy).toHaveBeenCalled();
  });

  it('should produce fetch jobs on init', async () => {
    const spy = jest.spyOn(service, 'produceFetchJobs').mockResolvedValue();
    await service.onModuleInit();
    expect(spy).toHaveBeenCalled();
  });

  it('should an immediate and repeating job for each source', async () => {
    queue.add = jest.fn().mockResolvedValue({ id: '123' });
    const spy = jest.spyOn(queue, 'add');

    await service.produceFetchJobs();

    // 2 immediate jobs + 2 repeated ones
    expect(spy).toBeCalledTimes(4);

    // It would be better to mock the sources, but I'm taking a shortcut here
    // immediate job for first source
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'https://coding-challenge.powerus.de/flight/source1',
      }),
      expect.not.objectContaining({ repeat: expect.anything() }),
    );
    // repeating job for first source
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'https://coding-challenge.powerus.de/flight/source1',
      }),
      expect.objectContaining({ repeat: expect.anything() }),
    );

    // immediate job for second source
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'https://coding-challenge.powerus.de/flight/source2',
      }),
      expect.not.objectContaining({ repeat: expect.anything() }),
    );
    // repeating job for second source
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'https://coding-challenge.powerus.de/flight/source2',
      }),
      expect.objectContaining({ repeat: expect.anything() }),
    );
  });

  it('should add flights', () => {
    const spy = jest.spyOn(Redis.prototype, 'sendCommand');
    service.addFlights([FlightMock.flight, FlightMock.anotherFlight]);
    expect(spy).toBeCalledTimes(2);
    expect(spy).toBeCalledWith(
      expect.objectContaining({
        args: expect.arrayContaining([
          'flights:LH123-2021-01-01T11:00:00Z-2021-01-01T10:00:00Z_LH456-2021-01-02T13:00:00Z-2021-01-02T12:00:00Z',
        ]),
      }),
    );
    expect(spy).toBeCalledWith(
      expect.objectContaining({
        args: expect.arrayContaining([
          'flights:EJ123-2021-01-01T13:30:00Z-2021-01-01T10:00:00Z_EJ789-2021-01-03T19:30:00Z-2021-01-03T14:30:00Z',
        ]),
      }),
    );
  });
});
