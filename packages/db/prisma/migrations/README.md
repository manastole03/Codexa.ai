# Versioned migrations

This project uses `prisma migrate`, not `prisma db push`. Migrations live in this
directory, are committed to git, and run automatically in production.

## Day-to-day

```bash
# When the schema changes — generates a new migration + applies it to local db
pnpm --filter @codexa/db db:migrate

# In production / CI
pnpm --filter @codexa/db db:migrate:deploy

# See where the database stands relative to the migration history
pnpm --filter @codexa/db db:migrate:status
```

## One-time: adopting versioned migrations on a database that was bootstrapped with `prisma db push`

If your local database was created with `db push` and already matches the
current schema, you do not want `migrate deploy` to try to re-apply the initial
migration. Mark it as already applied:

```bash
pnpm --filter @codexa/db exec prisma migrate resolve --applied 0_init
```

This writes a row to the `_prisma_migrations` table without running any SQL.
Run it **once** on each environment whose schema was built with `db push`.
Fresh databases don't need this — `migrate deploy` will run `0_init` on them.

## Escape hatch: `db push`

The `db:push` script is still available for rapid local prototyping (e.g. while
iterating on a new model before you're ready to commit a migration). Never use
it in production — it does not record history and cannot be rolled back.
