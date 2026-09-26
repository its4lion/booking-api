# Appointment Booking API

Standalone NestJS, PostgreSQL, and Prisma API for fixed appointment slots. There is no frontend, authentication, payment flow, or deployment setup.

## Prerequisites

- Bun 1.2 or newer
- PostgreSQL 14 or newer, with a local database for development and a separate database for tests

## Install and run

```bash
cp .env.example .env
bun install
bun run prisma:generate
bun run db:migrate
bun run db:seed
bun run start:dev
```

The API listens at `http://localhost:3000` by default. Set `PORT` to change it. Do not point `TEST_DATABASE_URL` at data you need to keep: the integration tests clean up their own fixture slots.

## API and OpenAPI

- `GET /slots` — available fixed slots ordered by start time, then ID.
- `POST /bookings` — book a slot; trims name and email, validates required fields and email syntax; returns 404 for an unknown slot and 409 if another active booking exists.
- `DELETE /bookings/{bookingId}` — cancel an active booking. Repeating the request returns the same cancelled booking with 200 and causes no additional state change or event. Cancelled bookings remain addressable.
- Swagger UI: `http://localhost:3000/docs`
- OpenAPI JSON: `http://localhost:3000/openapi.json`

The API is unauthenticated. Request and response bodies are JSON; IDs are UUIDs, timestamps are ISO 8601 UTC values, and errors use `{ "error": { "code": "...", "message": "..." } }`. The OpenAPI document is the source for field-level schemas and response examples.

## Database and concurrency decision

Slots are fixed rows; bookings reference a slot and retain their `active`/`cancelled` state. PostgreSQL migration `20260926000000_initial` adds a **partial unique index** on `bookings(slot_id)` for active rows. PostgreSQL arbitrates simultaneous inserts, guaranteeing no more than one active booking per slot even for different customer details. A unique violation becomes `409 SLOT_UNAVAILABLE`; checking availability in application code alone would not be race-safe. Cancellation changes the old row to `cancelled`, releasing the slot without deleting history. A conditional update makes repeated/concurrent cancellation idempotent.

The booking event is emitted only after the insert/update has committed. Since the database write is a single autocommitted statement, the API does not emit for rejected inserts or a noop cancellation. Durable delivery, replay, and exactly once delivery are intentionally out of scope.

## PostgreSQL backed API tests

Use a **dedicated test database or an isolated PostgreSQL schema** and set `TEST_DATABASE_URL` in `.env`, then:

```bash
set -a && source .env && set +a
DATABASE_URL="$TEST_DATABASE_URL" bunx prisma migrate deploy
bun run test:e2e
```

These e2e tests use Nest, HTTP requests, and a real PostgreSQL database (not mocked persistence). For example, this workspace uses schema `appointments_test` inside database `liham`, separate from its development `appointments` schema. They isolate themselves to three fixture UUIDs, clean those bookings before each test, and cover successful booking/availability, simultaneous conflicting requests with persisted active booking verification, and cancellation/rebooking. Running with `--runInBand` avoids test process races. To rerun from a clean database, the test setup resets these fixed fixtures itself; it does not delete unrelated rows.

`bun run test:e2e` uses Bun's builtin test runner. The test suite imports `bun:test` directly and exercises the Nest HTTP API against real PostgreSQL.

## Frontend Socket.IO verification

In one terminal run the server. In another run:

```bash
bun run socket:verify
```

The script connects to the default namespace `/` using `/socket.io` and prints `slot.booked` / `slot.released` event payloads. To target another server, set `API_URL=http://host:port`. While it listens, book an available seeded slot with `curl`, then cancel the returned booking ID:

```bash
curl -s http://localhost:3000/slots
curl -s -X POST http://localhost:3000/bookings -H 'content-type: application/json' \
  -d '{"slotId":"8e790dc3-c277-4a8f-98b1-9072fc73a101","customerName":"Morgan Chen","customerEmail":"morgan.chen@sample.net"}'
curl -i -X DELETE http://localhost:3000/bookings/BOOKING_UUID
```

Events carry only `slotId`, `bookingId`, and `available`; there is no client to server application event, authentication, rooms, durable delivery, or replay.

## Key decisions and future improvements

- The partial unique index is the concurrency boundary; no inmemory lock or read before write check is relied on.
- Cancellation preserves history, and availability is derived from absence of an active booking.
- Events follow successful committed writes; an outbox would be appropriate if durable delivery became a requirement.
- If the API is horizontally scaled, add the Socket.IO Redis adapter so broadcasts reach clients connected to every instance; it provides fan out, not durable delivery.
- If durable event delivery becomes a requirement, add a transactional outbox and a durable message broker with idempotent consumers.
- If slots need to change without reseeding, add an operator workflow for slot management; add cancellation/rescheduling policies or a waitlist only if the product requires them.
- Before public use, add authentication/access control and a clear retention policy for customer names and email addresses.
- Extend the PostgreSQL concurrency tests to cover identical customer details and simultaneous cancellation/rebooking races.
- As the project grows, add operational health/metrics and automated provisioning of isolated test databases/schemas.
- we could switch it to turborepo for better monorepo tooling :D
## Exercise notes

- Actual time spent: approximately 1h and 7 minutes;
- Unfinished/unverified: no known required implementation items remain. Swagger UI and OpenAPI JSON responded successfully; the contract was not exhaustively schema diff tested. The production build/start and all three PostgreSQL backed API tests passed.
- AI disclosure: OpenAI GPT-6 Luna was used through OpenCode. Before implementation, I made a plan covering the Prisma data model and PostgreSQL partial unique index, API/error handling, Socket.IO events, OpenAPI, PostgreSQL tests, and submission docs; I then implemented those pieces in that order. I used the `nestjs-best-practices` and `backend-testing` skills for architecture and test guidance. I reviewed the code and contract, verified the production build/start output, applied the migration to an isolated PostgreSQL schema, and ran all three PostgreSQL tests with Bun successfully.
