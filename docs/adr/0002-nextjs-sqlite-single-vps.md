# Next.js + SQLite on a single VPS

The app is built with Next.js, TypeScript, Prisma, SQLite and Recharts, shipped as one Docker container on a single VPS. SQLite was chosen over Postgres or a managed database because this is a single-user workload with no need for a separate database server or vendor lock-in.
