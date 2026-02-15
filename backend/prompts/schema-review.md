# Database Schema Review

Review the following database schema for correctness, performance, and data integrity.

## Check For

1. **Normalisation** — Is data normalised appropriately? Are there redundant columns that will get out of sync?
2. **Naming** — Are table and column names consistent (snake_case, singular/plural)?
3. **Primary keys** — Does every table have an appropriate primary key? Are UUIDs used where needed for distribution?
4. **Foreign keys** — Are relationships properly constrained with foreign keys? Are ON DELETE/UPDATE actions set correctly?
5. **Indexes** — Are indexes created for columns used in WHERE, JOIN, and ORDER BY clauses? Are there unused or redundant indexes?
6. **Data types** — Are column types appropriate (e.g., `timestamptz` not `varchar` for dates, `decimal` not `float` for money)?
7. **Constraints** — Are NOT NULL, UNIQUE, and CHECK constraints used where appropriate?
8. **Soft deletes** — If using soft deletes, are queries filtered correctly? Are unique indexes partial?
9. **Migration safety** — Can the schema change be applied without downtime?

## Output Format

For each finding:

- **Table/Column**: What's affected
- **Severity**: 🔴 Data risk / 🟡 Performance / 🟢 Convention
- **Issue**: Description
- **Fix**: Corrected DDL or migration
