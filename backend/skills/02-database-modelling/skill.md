# Database Modelling

## Description

Design database schemas that balance normalisation, query performance, and evolvability — regardless of whether you use a relational database (PostgreSQL, SQL Server, MySQL), a document store (MongoDB, CosmosDB), or a combination. This skill covers the universal data modelling principles: entity identification, relationship mapping, indexing strategy, migration discipline, and the trade-offs between normalisation and denormalisation.

## When To Use

- Starting a new feature that requires persistent data
- Designing the initial schema for a new service or application
- Adding a relationship between existing entities
- Queries are slow and you suspect missing or incorrect indexes
- Evaluating whether to normalise or denormalise a data structure
- Planning a schema migration on a live database

## Prerequisites

- Basic SQL knowledge (SELECT, JOIN, WHERE, CREATE TABLE)
- Understanding of primary keys, foreign keys, and constraints
- Familiarity with at least one database system

## Instructions

### 1. Identify Entities and Relationships

Start with the domain, not the database. Map out:

- **Entities** — the nouns: User, Order, Product, Invoice
- **Attributes** — the data each entity holds
- **Relationships** — how entities relate: a User *has many* Orders, an Order *belongs to* a User, an Order *has many* OrderItems

Classify relationships:

| Type | Example | Implementation |
|------|---------|----------------|
| **One-to-One** | User → Profile | FK on either side, or same table |
| **One-to-Many** | User → Orders | FK on the "many" side |
| **Many-to-Many** | Order → Products | Junction/join table (OrderItems) |

### 2. Normalise First, Denormalise with Purpose

Start normalised (3NF) — every fact stored once:

```sql
-- ✅ Normalised: customer data in one place
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

Denormalise **only** when:
- A read-heavy query joins 5+ tables and performance is proven insufficient
- You need a materialised view or cache table for reporting
- You're using a document store where embedding is the idiomatic pattern

**Always document why** you denormalised. Future developers will see the duplication and try to "fix" it.

### 3. Choose the Right Primary Keys

| Strategy | Pros | Cons |
|----------|------|------|
| **UUID (v4/v7)** | Globally unique, no coordination needed, safe to expose | Larger, poor index locality (v4). Use UUIDv7 for time-ordered. |
| **Auto-increment** | Compact, fast inserts, natural ordering | Leaks count, requires coordination in distributed systems |
| **ULID / KSUID** | Time-ordered + unique, compacts well | Less ecosystem support |

**Recommendation:** UUIDv7 or ULID for new systems. They combine global uniqueness with time-ordering for index efficiency. Never expose auto-increment IDs externally.

### 4. Design Indexes Intentionally

Indexes are the difference between a 5ms query and a 5s query:

```sql
-- Index columns that appear in WHERE, JOIN, and ORDER BY
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_status_created ON orders(status, created_at DESC);

-- Partial index for active records only
CREATE INDEX idx_orders_pending ON orders(created_at)
  WHERE status = 'pending';

-- Covering index to avoid table lookups
CREATE INDEX idx_orders_summary ON orders(customer_id, status, total);
```

**Indexing rules of thumb:**
- **Every foreign key should be indexed.** Without it, `JOIN` and `ON DELETE CASCADE` do full table scans.
- **Composite indexes:** Put high-cardinality columns first. An index on `(status, date)` works for `WHERE status = 'active' AND date > '...'` but not for `WHERE date > '...'` alone.
- **Don't over-index.** Each index slows writes. Benchmark before adding.
- **Use `EXPLAIN ANALYZE`** to verify your indexes are actually being used.

### 5. Plan for Schema Evolution

Your schema will change. Plan for safe migrations:

- **Always use migration files.** Never modify a database manually in production. Use a migration tool (Flyway, Liquibase, Prisma Migrate, EF Migrations, Alembic).
- **Make migrations backwards-compatible** when possible — the old code should still work against the new schema during deployment.

**Safe migration patterns:**

| Change | Safe approach |
|--------|--------------|
| Add column | `ALTER TABLE ADD COLUMN ... DEFAULT ...` (not null requires default) |
| Remove column | Stop reading it first → deploy → then drop the column |
| Rename column | Add new column → backfill → update code → drop old column |
| Change type | Add new column → backfill with cast → update code → drop old |
| Add constraint | Add as `NOT VALID` → validate separately (avoids full table lock) |

- **Never rename or drop a column in the same deploy that changes the code.** The old code is still running during rollout.

### 6. Handle Soft Deletes and Temporal Data

Decide early whether records are hard-deleted or soft-deleted:

```sql
-- Soft delete pattern
ALTER TABLE orders ADD COLUMN deleted_at TIMESTAMPTZ;

-- All queries must filter: WHERE deleted_at IS NULL
-- Consider a view for convenience:
CREATE VIEW active_orders AS
  SELECT * FROM orders WHERE deleted_at IS NULL;
```

**Trade-offs:**
- Soft delete: Keeps audit trail, enables undo, but complicates every query and unique constraints
- Hard delete: Simpler queries, but data is gone (use an audit/event log instead for history)

For time-sensitive data (prices, configurations), consider **temporal patterns** (valid_from/valid_to) or event sourcing.

## Best Practices

- **Use constraints aggressively.** `NOT NULL`, `UNIQUE`, `CHECK`, and `FOREIGN KEY` constraints catch bugs at the database level before they reach your application.
- **Store timestamps in UTC** with timezone (`TIMESTAMPTZ`). Convert to local time at the presentation layer.
- **Use appropriate data types.** `NUMERIC`/`DECIMAL` for money (not `FLOAT`), `TEXT` over `VARCHAR(n)` in PostgreSQL, `JSONB` for semi-structured data when schema flexibility is needed.
- **Name things consistently.** `snake_case` for tables and columns, singular or plural table names (pick one), descriptive foreign keys (`customer_id` not `cid`).
- **Add `created_at` and `updated_at` to every table.** You'll need them for debugging, auditing, and ordering.
- **Avoid `SELECT *` in application code.** Specify columns to benefit from covering indexes and reduce over-fetching.

## Common Pitfalls

- **Missing indexes on foreign keys.** This is the #1 cause of slow queries in production. Every FK needs an index.
- **Storing computed values without a sync strategy.** An `order_count` column on the user table is stale the moment a new order is inserted unless you maintain it with triggers or application logic.
- **Polymorphic associations.** A `commentable_type` + `commentable_id` pattern breaks foreign key constraints. Prefer separate join tables or table inheritance.
- **Premature denormalisation.** "We might need it to be fast" is not a measured performance problem. Start normalised and optimise with evidence.
- **N+1 queries at the application layer.** Not a schema problem per se, but poor schema design (missing relationships, no eager-load hints) makes N+1 more likely. Know your ORM's loading behaviour.
- **Running migrations without a rollback plan.** Every migration should be reversible. Test the rollback before deploying.

## Reference

- [Use The Index, Luke — SQL Indexing Guide](https://use-the-index-luke.com/)
- [PostgreSQL Documentation — Data Types](https://www.postgresql.org/docs/current/datatype.html)
- [Database Design Fundamentals — Microsoft Learn](https://learn.microsoft.com/en-us/sql/relational-databases/database-design)
- [Evolutionary Database Design — Martin Fowler](https://martinfowler.com/articles/evodb.html)
