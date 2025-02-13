ARG NODE_VERSION=22.13.0
ARG PNPM_VERSION=9.15.4

FROM node:${NODE_VERSION}-alpine AS base
ENV NODE_ENV production
RUN --mount=type=cache,target=/root/.npm \
    npm install -g pnpm@${PNPM_VERSION}


FROM base AS server_deps

WORKDIR /usr/src/app
RUN --mount=type=bind,source=./server/package.json,target=package.json \
    --mount=type=bind,source=./server/pnpm-lock.yaml,target=pnpm-lock.yaml \
    --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm fetch
RUN --mount=type=bind,source=./server/package.json,target=package.json \
    --mount=type=bind,source=./server/pnpm-lock.yaml,target=pnpm-lock.yaml \
    --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --offline --frozen-lockfile


FROM server_deps AS server_build

COPY ./server .
RUN pnpm build
RUN pnpm prune --prod
RUN ( wget -q -O /dev/stdout https://gobinaries.com/tj/node-prune | sh ) \
    && node-prune


FROM base as client_deps

WORKDIR /usr/src/app
RUN --mount=type=bind,source=./client/package.json,target=package.json \
    --mount=type=bind,source=./client/pnpm-lock.yaml,target=pnpm-lock.yaml \
    --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm fetch
RUN --mount=type=bind,source=./client/package.json,target=package.json \
    --mount=type=bind,source=./client/pnpm-lock.yaml,target=pnpm-lock.yaml \
    --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --offline --frozen-lockfile


FROM client_deps AS client_build

COPY ./client .
RUN pnpm build
RUN pnpm prune --prod
RUN ( wget -q -O /dev/stdout https://gobinaries.com/tj/node-prune | sh ) \
    && node-prune


FROM node:${NODE_VERSION}-alpine

ENV NODE_ENV production
RUN apk add dumb-init
USER node
WORKDIR /usr/src/app
COPY --from=server_build /usr/src/app/node_modules ./node_modules
COPY --from=server_build /usr/src/app/dist ./
COPY --from=client_build /usr/src/app/dist ./static
EXPOSE 8080

CMD ["dumb-init", "node", "index.js"]
