FROM node:18.17.1-bullseye-slim AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

# Production image, install prod dependencies, copy all the files and run Node
FROM base AS prod
WORKDIR /app

ENV NODE_ENV production

COPY package*.json ./
# Disable husky
RUN npm pkg delete scripts.prepare
RUN npm ci --omit=dev

COPY --from=builder /app/build ./

USER node

CMD ["node", "index.js"]
