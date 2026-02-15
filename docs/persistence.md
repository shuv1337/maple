# Persistence Operations

Maple stores dashboard persistence data in SQLite/libSQL and uses Drizzle migrations.

## Modes

- Local default: `MAPLE_DB_URL` unset, DB file at `apps/api/.data/maple.db`
- Turso/libSQL remote: set `MAPLE_DB_URL` and `MAPLE_DB_AUTH_TOKEN`

## Migration Commands

Run from repo root:

```bash
bun run db:migrate
```

Generate new migration from schema changes:

```bash
bun run db:generate
```

Apply schema directly without migration files (development utility):

```bash
bun run db:push
```

Open Drizzle Studio:

```bash
bun run db:studio
```

## API Runtime Behavior

`@maple/api` runs `db:migrate` automatically before `dev` and `start` so pending migrations are applied at startup.

## Self-Host Note

For file-based mode, mount/persist `apps/api/.data` in your runtime environment.
