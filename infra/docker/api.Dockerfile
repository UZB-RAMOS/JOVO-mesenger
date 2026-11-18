FROM node:24.20-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json tsconfig.base.json prisma.config.ts ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY apps/worker/package.json apps/worker/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY prisma prisma
RUN npm ci
COPY apps/api apps/api
COPY packages/shared packages/shared
RUN npm run db:generate && npm run build --workspace @jovo/api

FROM node:24.20-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/src/generated ./apps/api/src/generated
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma.config.ts /app/package.json ./
EXPOSE 4000
CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && node apps/api/dist/main.js"]
