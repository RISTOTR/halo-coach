# Supabase-generated types

TODO: generate `types/database.types.ts` from a running, isolated Supabase DB.
No generated output is fabricated. The Nuxt Supabase module already expects this path.

From the repository root, after applying the local migrations:

```sh
npx --no-install supabase gen types --lang typescript --local --schema public > /tmp/halo-database.types.ts &&
  test -s /tmp/halo-database.types.ts &&
  cp /tmp/halo-database.types.ts types/database.types.ts
```

The chained command replaces the target only after successful, nonempty generation.
The CLI is now a project devDependency; a running local database is still required.
Generated local types describe the INFERRED baseline, not hosted SQL. RPC types
remain absent until real definitions are recovered and applied locally. Then
regenerate, check the diff, and run Nuxt's type checks in the later typing phase.
Generating types does not itself repair existing DTO or query mistakes.
