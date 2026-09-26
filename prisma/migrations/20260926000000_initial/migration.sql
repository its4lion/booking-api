CREATE TYPE "booking_status" AS ENUM ('active', 'cancelled');

CREATE TABLE "slots" (
    "id" UUID NOT NULL,
    "starts_at" TIMESTAMPTZ(3) NOT NULL,
    "ends_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "slots_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "slots_valid_interval" CHECK ("ends_at" > "starts_at")
);

CREATE TABLE "bookings" (
    "id" UUID NOT NULL,
    "slot_id" UUID NOT NULL,
    "customer_name" VARCHAR(200) NOT NULL,
    "customer_email" VARCHAR(320) NOT NULL,
    "status" "booking_status" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "bookings_slot_id_fkey" FOREIGN KEY ("slot_id") REFERENCES "slots"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "slots_starts_at_id_idx" ON "slots"("starts_at", "id");
CREATE INDEX "bookings_slot_id_status_idx" ON "bookings"("slot_id", "status");

-- PostgreSQL arbitrates concurrent inserts, including requests with identical customer details.
CREATE UNIQUE INDEX "bookings_one_active_per_slot" ON "bookings"("slot_id") WHERE "status" = 'active';
