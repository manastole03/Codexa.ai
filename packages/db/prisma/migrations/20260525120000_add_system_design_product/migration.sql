-- Adds the third product kind for the System Design whiteboard.
-- Postgres requires ADD VALUE to run outside of a transaction, which is fine —
-- prisma migrate runs each .sql file in its own statement context.
ALTER TYPE "ProductKind" ADD VALUE IF NOT EXISTS 'SYSTEM_DESIGN';
