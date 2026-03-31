# Database Modelling

## Entity and Relationship Design

Start with the domain, not the database. Identify entities (nouns), attributes, and relationships before writing any DDL.

| Relationship type | Example | Implementation |
|-------------------|---------|----------------|
| **One-to-One** | User → Profile | FK on either side, or same table |
| **One-to-Many** | User → Orders | FK on the "many" side |
| **Many-to-Many** | Order → Products | Junction table (`order_items`) |

## Schema Design Rules

Normalise to 3NF by default — every fact stored once:

```sql
CREATE TABLE customers (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email      TEXT NOT NULL UNIQUE,
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE orders (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  status      TEXT NOT NULL DEFAULT 'pending',
  total       NUMERIC(12,2) NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Denormalise only when a read-heavy query joins 5+ tables and performance is proven insufficient. Always document why you denormalised — future developers will try to "fix" it.

## Primary Key Strategy

| Strategy | Pros | Cons |
|----------|------|------|
| **UUIDv7 / ULID** | Globally unique, time-ordered, index-efficient | Less ecosystem support than v4 |
| **UUIDv4** | Globally unique, no coordination | Poor index locality, larger than integer |
| **Auto-increment** | Compact, fast inserts, natural ordering | Leaks row count, requires coordination in distributed systems |

Use UUIDv7 or ULID for new systems. Never expose auto-increment IDs externally.

## Indexing

```sql
-- Index every foreign key
CREATE INDEX idx_orders_customer_id ON orders(customer_id);

-- Composite index for common filter + sort
CREATE INDEX idx_orders_status_created ON orders(status, created_at DESC);

-- Partial index for hot subset
CREATE INDEX idx_orders_pending ON orders(created_at) WHERE status = 'pending';
```

Rules:
- Index every foreign key — without it, `JOIN` and `ON DELETE CASCADE` do full table scans
- Put high-cardinality columns first in composite indexes
- Don't over-index — each index slows writes
- Run `EXPLAIN ANALYZE` to verify indexes are actually used

## Schema Migrations

Use a migration tool (Flyway, Liquibase, Prisma Migrate, EF Migrations, Alembic). Never modify production databases manually.

| Change | Safe approach |
|--------|---------------|
| Add column | `ALTER TABLE ADD COLUMN ... DEFAULT ...` |
| Remove column | Stop reading it first → deploy → drop the column |
| Rename column | Add new → backfill → update code → drop old |
| Change type | Add new → backfill with cast → update code → drop old |
| Add `NOT NULL` constraint | Add `CHECK (col IS NOT NULL) NOT VALID`, validate, then optionally `ALTER COLUMN ... SET NOT NULL` |

Never rename or drop a column in the same deploy that changes the application code. The old code is still running during rollout. Every migration must have a tested rollback.

## Soft Deletes

Decide early: hard delete vs soft delete.

```sql
-- Soft delete
ALTER TABLE orders ADD COLUMN deleted_at TIMESTAMPTZ;

-- All queries must filter: WHERE deleted_at IS NULL
-- Use a view to encapsulate the filter:
CREATE VIEW active_orders AS SELECT * FROM orders WHERE deleted_at IS NULL;
```

Soft delete keeps audit trail and enables undo, but complicates every query and unique constraints. Hard delete is simpler — use an event/audit log for history instead.

## Anti-patterns

| Pattern | Fix |
|---------|-----|
| Missing FK indexes | Add an index on every foreign key column |
| Storing computed aggregates without sync | Use triggers, application logic, or views |
| Polymorphic `commentable_type` / `commentable_id` | Use separate join tables or table inheritance |
| Premature denormalisation | Start normalised, optimise with measured evidence |
| `FLOAT` for money | Use `NUMERIC(12,2)` or integer cents |
| Running migrations without rollback plan | Test rollback before deploying |

## Best Practices

- Apply `NOT NULL`, `UNIQUE`, `CHECK`, and `FOREIGN KEY` constraints aggressively — they catch bugs at the database level
- Store all timestamps in UTC with timezone (`TIMESTAMPTZ`); convert to local time at the presentation layer
- Add `created_at` and `updated_at` to every table
- Use `snake_case` for all table and column names; pick singular or plural table names and stick to it
- Name foreign keys descriptively: `customer_id`, not `cid`
- Avoid `SELECT *` in application code — specify columns to benefit from covering indexes
- Use `JSONB` for semi-structured data when schema flexibility is genuinely needed, not as a default
