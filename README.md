# EDH ELO Tracker

Next.js (App Router) project for tracking Commander / EDH games, ELO ratings, decks, and stats.

## Getting Started

Install dependencies and generate the Prisma client:

```bash
npm install
npm run prisma:generate
```

Start the dev server at [http://localhost:3000](http://localhost:3000):

```bash
npm run dev
```

> **Note**  
> Next.js 15 and Prisma 6 require Node.js 18.18 or newer. Use a tool like `nvm`, `asdf`, or Volta to pin to Node 20 if you run into local build failures.

## Authentication Setup

Google OAuth powers sign-in via [NextAuth.js](https://next-auth.js.org/) (App Router integration). Before running the app configure a Google Cloud OAuth client and set these environment variables in `.env`:

```bash
NEXTAUTH_SECRET= # `openssl rand -base64 32` (or AUTH_SECRET)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
DATABASE_URL=postgres://...
GOOGLE_SHEETS_CREDENTIALS= # service account JSON, for the spreadsheet import
SPREADSHEET_ID=           # the spreadsheet games are recorded in
CRON_SECRET=              # `openssl rand -hex 32`, for the scheduled import
```

After setting the variables:

1. Install the auth dependencies:
   ```bash
   npm install next-auth @next-auth/prisma-adapter
   ```
2. Apply the new Prisma models:
   ```bash
   npx prisma migrate dev
   ```
3. Regenerate the Prisma client:
   ```bash
   npm run prisma:generate
   ```
4. Restart the dev server so Next.js picks up the auth configuration.

Newly authenticated users are stored in the `User` table and can be associated with existing `Player` rows through the optional `userId` field.

## Database

The project uses PostgreSQL (see `docker-compose.yml` for local development). Seed data and helper scripts live in `app/api`.

## Importing games from the spreadsheet

Games are recorded in a Google Sheet the app reads but does not own — there is no way to have it notify us, so the import polls. `GET /api/sync/sheet` brings the database up to date with it, and `vercel.json` schedules that daily. Vercel authenticates the request with `CRON_SECRET` as a bearer token; requests without it are rejected. Admins can also trigger it on demand from `/debug`, which posts to `/api/seed`. Either way the run is recorded at `/debug/imports`, along with any row it could not read.

The spreadsheet is the authority, and the stored games should be a leading run of it. The import walks the two in the order the games were played and compares everything the spreadsheet has to say about each. From the first game they disagree on, nothing stored can be trusted: ELO is a running total, so an edited, inserted or deleted row leaves every rating after it wrong, and correcting one game in place would not fix the rest. So the import discards the stored history from that point and reads it afresh. In the ordinary case — the spreadsheet has simply gained rows — there is no disagreement and nothing is discarded.

A stored game with no rating counts as a disagreement even when its row has not changed, because every later rating was computed as though it had never been played. The same goes for one referencing a deck that no longer exists, which cannot be compared at all. Both are reported at `/debug/imports` as well as rebuilt.

A game stored that the spreadsheet does not describe will be deleted. There is no way to record a game except through the spreadsheet, which is why there is no endpoint for creating one.

Each game is scored as it is stored, rather than in a pass at the end. That makes the database always a *complete* prefix of the spreadsheet, which is what lets the import be interrupted safely: it stops on its own after 45 seconds, well inside the function's 60-second limit, and reports how many games it did not reach. The next run finds those games missing and carries on. `vercel.json` therefore schedules several runs an hour apart, so a rebuild needing more than one invocation finishes the same morning. A run that finds nothing to do costs one spreadsheet read.

Only `Game` and `EloScore` rows are discarded and rebuilt. Players, decks, and the metadata attached to them (deck colours, decklist URLs) are never deleted.

## Additional Scripts

- `npm test` / `npm run test:watch` - run the unit tests.
- `npm run db:up` / `db:down` - start/stop the local Postgres container.
- `npm run db:reset` - reset the database schema.
- `npm run prisma:studio` - inspect and edit data with Prisma Studio.

## Deployment

The app targets Vercel, but any Next.js hosting platform with Node.js 18+ and Postgres support will work. Ensure production deployments set the same environment variables described above.

### Migrations

`npm run build` applies pending migrations, but only when `VERCEL_ENV` is `production` — see `scripts/apply-migrations.sh`. Every environment shares one `DATABASE_URL`, so there is no separate database behind a preview deployment, and a preview build applying migrations would alter production before the pull request the migration arrived in had been reviewed.

So migrations land on merge, not on push. The consequence to expect: a preview of a branch that adds a migration runs against a database that does not have it yet, and whatever depends on the new column will error *on that preview*. That is the trade — a broken preview page is recoverable, an unreviewed migration on production is not.

Preview deployments still read and write production data at runtime. Giving preview its own database (a Neon branch, with a `DATABASE_URL` scoped to Preview only) is what would fix that, and would make the migration gate unnecessary.
