FROM node:24-alpine AS base

RUN apk add --no-cache gcompat

FROM base AS deps

WORKDIR /app

COPY ./package.json ./package.json
COPY ./yarn.lock ./yarn.lock

RUN yarn install --frozen-lockfile

FROM base AS runner

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY ./src ./src
COPY ./tsconfig.json ./tsconfig.json

RUN echo "{}" > config.json

ENV NODE_ENV=production

CMD ["yarn", "start", "-c", "/app/config.json"]
