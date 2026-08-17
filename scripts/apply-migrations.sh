#!/bin/sh
# Applies pending migrations, and only ever to the production database.
#
# One DATABASE_URL is shared by every environment, so there is no separate
# database behind a preview deployment. A preview build applying migrations would
# alter production before anyone had reviewed the pull request the migration
# arrived in — a rename or a drop would take effect on a branch push. Only a
# production build, which Vercel makes from the production branch, may migrate.
#
# So migrations reach the database on merge rather than on push, and a preview of
# a branch that adds one runs against a database without it: whatever depends on
# the new column fails on that preview. That is the intended trade. A preview
# page that errors is recoverable; an unreviewed migration on production is not.
set -eu

if [ "${VERCEL_ENV:-}" = "production" ]; then
  echo "Production build: applying pending migrations"
  exec prisma migrate deploy
fi

if [ -n "${VERCEL_ENV:-}" ]; then
  echo "Skipping migrations: a $VERCEL_ENV build shares the production database"
else
  echo "Skipping migrations: not a Vercel build - use 'npm run prisma:migrate'"
fi
