#!/bin/sh
set -eu

# Apply any pending Prisma migrations to the SQLite database on the mounted
# volume before starting the server, so the schema is always up to date and
# the database is created on first boot.
./node_modules/.bin/prisma migrate deploy

exec node server.js
