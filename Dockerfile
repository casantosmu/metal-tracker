FROM node:22.1.0-bullseye-slim AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

COPY package*.json ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

# Production image, create db directory, install prod dependencies, copy all the files and run Node
FROM base AS prod
WORKDIR /app

ENV NODE_ENV production

RUN mkdir -p sqlite
RUN chown -R node sqlite

COPY package*.json ./
# Disable husky
RUN npm pkg delete scripts.prepare
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./

USER node

CMD ["node", "index.js"]
