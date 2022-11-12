import { AxiosResponse } from 'axios';
import { HttpModule, HttpService } from '@nestjs/axios';
import { Job } from 'bull';
import { mock } from 'jest-mock-extended';
import { of } from 'rxjs';
import { Test, TestingModule } from '@nestjs/testing';

import { FlightMock } from './flight.interface.spec';
import { FlightSourceConsumer } from './flight-source.consumer';
import { FlightsService } from './flights.service';
import { FlightsServiceMock } from './flights.service.spec';
import { Logger } from '@nestjs/common';
import { createSandbox, SinonStub } from 'sinon';

describe('FlightSourceConsumer', () => {
  let httpService: HttpService;
  let consumer: FlightSourceConsumer;
  let flightsService: FlightsService;

  const job: Job = mock<Job>();
  const successResponse: AxiosResponse = {
    data: {
      flights: [FlightMock.flight, FlightMock.anotherFlight],
    },
    status: 200,
    statusText: 'OK',
    headers: { contentType: 'application/json' },
    config: {},
  };
  const errorResponse: AxiosResponse = {
    data: {},
    status: 500,
    statusText: 'Internal Server Error',
    headers: {},
    config: {},
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [HttpModule],
      providers: [
        FlightSourceConsumer,
        {
          provide: FlightsService,
          useClass: FlightsServiceMock,
        },
      ],
    }).compile();

    httpService = module.get<HttpService>(HttpService);
    consumer = module.get<FlightSourceConsumer>(FlightSourceConsumer);
    flightsService = module.get<FlightsService>(FlightsService);
    job.data = {
      source: 'https://example.com',
    };
  });

  it('should be defined', () => {
    expect(consumer).toBeDefined();
  });

  it('should request flights from source', async () => {
    const spy = jest
      .spyOn(httpService, 'get')
      .mockImplementationOnce(() => of(successResponse));

    await consumer.fetch(job);
    expect(spy).toHaveBeenCalledWith('https://example.com', {
      headers: { Accept: 'application/json' },
    });
  });

  it('should add flights to store on successful response', async () => {
    jest
      .spyOn(httpService, 'get')
      .mockImplementationOnce(() => of(successResponse));
    const spy = jest.spyOn(flightsService, 'addFlights');

    await consumer.fetch(job);
    expect(spy).toHaveBeenCalledWith([
      FlightMock.flight,
      FlightMock.anotherFlight,
    ]);
  });

  describe('on error', () => {
    let loggerSpy: SinonStub;

    beforeAll(() => {
      // Hide error logs
      const sandbox = createSandbox();
      loggerSpy = sandbox.stub(Logger.prototype, 'error').returns();
    });

    it('should log error on unsuccessful response', async () => {
      jest
        .spyOn(httpService, 'get')
        .mockImplementationOnce(() => of(errorResponse));

      await consumer.fetch(job);
      expect(loggerSpy.called).toBeTruthy();
    });

    it('should not add flights to store on unsuccessful response', async () => {
      jest
        .spyOn(httpService, 'get')
        .mockImplementationOnce(() => of(errorResponse));
      const spy = jest.spyOn(flightsService, 'addFlights');

      await consumer.fetch(job);
      expect(spy).not.toHaveBeenCalled();
    });

    it('should mark job as failed on unsuccessful response', async () => {
      jest
        .spyOn(httpService, 'get')
        .mockImplementationOnce(() => of(errorResponse));
      const spy = jest.spyOn(job, 'moveToFailed');

      await consumer.fetch(job);
      expect(spy).toHaveBeenCalled();
    });
  });
});
