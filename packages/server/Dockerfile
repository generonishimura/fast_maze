FROM node:20-slim AS builder
WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/server/package.json packages/server/
RUN npm ci --workspace=@fast-maze/server --include-workspace-root

COPY packages/shared/ packages/shared/
COPY packages/server/ packages/server/
COPY tsconfig.json ./

RUN npx tsc -p packages/server/tsconfig.json

FROM node:20-slim
WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/server/package.json packages/server/
RUN npm ci --workspace=@fast-maze/server --include-workspace-root --omit=dev

COPY --from=builder /app/packages/server/dist/ packages/server/dist/
COPY --from=builder /app/packages/shared/ packages/shared/

EXPOSE 2567
CMD ["node", "packages/server/dist/index.js"]
