# Build from the repository root: docker build -f apps/worker/Dockerfile .
FROM node:24-slim AS base
RUN npm install --global pnpm@12.11.2
WORKDIR /app

# Keep only the worker and the workspace packages it needs (core, db, cli, config).
FROM base AS prune
COPY . .
RUN pnpm dlx turbo@2.11.8 prune @recap/worker --docker

FROM base AS build
# Manifests first, so the install layer is reused until dependencies change.
COPY --from=prune /app/out/json/ .
RUN pnpm install --frozen-lockfile
COPY --from=prune /app/out/full/ .
# prisma generate requires DATABASE_URL to be set, but never connects to it.
RUN DATABASE_URL=postgresql://build@localhost:5432/build pnpm turbo run build --filter=@recap/worker

FROM build AS runtime
ENV NODE_ENV=production
USER node
CMD ["node", "apps/worker/dist/main.js"]
