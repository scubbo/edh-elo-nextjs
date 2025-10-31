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

## Additional Scripts

- `npm run db:up` / `db:down` - start/stop the local Postgres container.
- `npm run db:reset` - reset the database schema.
- `npm run prisma:studio` - inspect and edit data with Prisma Studio.

## Deployment

The app targets Vercel, but any Next.js hosting platform with Node.js 18+ and Postgres support will work. Ensure production deployments set the same environment variables described above.
