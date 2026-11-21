#!/bin/sh
# Apply pending migrations, then start the Next.js standalone server.
set -e
prisma migrate deploy --schema ./prisma/schema.prisma
exec node server.js
