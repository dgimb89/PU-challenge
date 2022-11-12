import { Flight, getFlightIdentifier } from './flight.interface';

export class FlightMock {
  static flight: Flight = {
    slices: [
      {
        origin_name: 'Berlin',
        destination_name: 'London',
        departure_date_time_utc: '2021-01-01T10:00:00Z',
        arrival_date_time_utc: '2021-01-01T11:00:00Z',
        flight_number: 'LH123',
        duration: 60,
      },
      {
        origin_name: 'London',
        destination_name: 'Berlin',
        departure_date_time_utc: '2021-01-02T12:00:00Z',
        arrival_date_time_utc: '2021-01-02T13:00:00Z',
        flight_number: 'LH456',
        duration: 60,
      },
    ],
  };

  static anotherFlight: Flight = {
    slices: [
      {
        origin_name: 'Berlin',
        destination_name: 'Reykjavík',
        departure_date_time_utc: '2021-01-01T10:00:00Z',
        arrival_date_time_utc: '2021-01-01T13:30:00Z',
        flight_number: 'EJ123',
        duration: 210,
      },
      {
        origin_name: 'Reykjavík',
        destination_name: 'Berlin',
        departure_date_time_utc: '2021-01-03T14:30:00Z',
        arrival_date_time_utc: '2021-01-03T19:30:00Z',

        flight_number: 'EJ789',
        duration: 210,
      },
    ],
  };
}

describe('FlightInterface', () => {
  it('getFlightIdentifier should construct stable identifiers for flights', () => {
    expect(getFlightIdentifier(FlightMock.flight)).toBe(
      'LH123-2021-01-01T11:00:00Z-2021-01-01T10:00:00Z_LH456-2021-01-02T13:00:00Z-2021-01-02T12:00:00Z',
    );

    expect(getFlightIdentifier(FlightMock.anotherFlight)).toBe(
      'EJ123-2021-01-01T13:30:00Z-2021-01-01T10:00:00Z_EJ789-2021-01-03T19:30:00Z-2021-01-03T14:30:00Z',
    );
  });
});
