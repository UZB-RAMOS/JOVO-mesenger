import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations', seed: 'tsx prisma/seed.ts' },
  datasource: {
    url: process.env.DATABASE_URL ?? 'postgresql://jovo:change-me-local-only@localhost:5432/jovo?schema=public',
  },
});
