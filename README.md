# Quick start
- Clone the repository
```bash
git clone https://github.com/non-deterministic-oracle/PU-challenge.git
```

* Switch to the repo folder
```bash
cd PU-challenge
```

* Install Docker from https://www.docker.com

* Copy `.env` file and change variables, if needed
```bash
cp .env.example .env
```

* Bring up the NestJS server
```bash
docker compose up nestjs-dev
```

* Access http://localhost:3000

# Implementation overview
**Redis storage** for flight data
- Just-in-time requests to endpoints is unreliable, pre-fetching is required
- Robust, performant read & write
- Key-Value design **implicitly eliminates duplicates**
- Multi-client support, straight forward scaling
- Offers efficient **data expiration** via in-built TTL
- Storing and query logic is implemented in `src/flights/flights.service.ts`

**Repeating jobs** to fetch flight data from sources using the [**Bull Queue system**](https://github.com/OptimalBits/bull)
- One job for each data source allows parallelization
- Allows to spread out fetching Jobs throughout multiple workers, if needed
- Great configuration options, e.g. **retry with backoff** or **job throttling** to prevent network stalling (see `src/flights/flights.module.ts`)
- Use of Redis as backend
- **Job Consumer** logic is implemented in `src/flights/flight-source.consumer.ts`
- **Job Producer** logic is implemented in `src/flights/flights.service.ts`, see `produceFetchJobs` method

## Caveats
 - If flights are removed from all sources, they will remain valid until the records expire (configurable via `FLIGHTS_CACHE_TTL_S`).