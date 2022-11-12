interface Slice {
  origin_name: string;
  destination_name: string;
  departure_date_time_utc: string;
  arrival_date_time_utc: string;
  flight_number: string;
  duration: number;
}

export interface Flight {
  slices: Slice[];
}

function getSliceIdentifier(slice: Slice): string {
  // Dates are in UTC, so we can use them directly in the identifier.
  // Note: If time zones were to be considered, we would need to convert
  // the dates first to  correctly detect collisions.
  return `${slice.flight_number}-${slice.arrival_date_time_utc}-${slice.departure_date_time_utc}`;
}

export function getFlightIdentifier(flight: Flight) {
  return flight.slices.map((slice) => getSliceIdentifier(slice)).join('_');
}
