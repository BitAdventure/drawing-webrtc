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

ARG SERVER_URL
ARG API_BASE_URL
ARG HASURA_BASE_URL
ARG WEB_SOCKET_URL
ARG UNIVERSAL_LOGIN_URL

ENV VITE_SERVER_URL=${SERVER_URL}
ENV VITE_API_BASE_URL=${API_BASE_URL}
ENV VITE_API_HASURA_BASE_URL=${HASURA_BASE_URL}
ENV VITE_API_WEB_SOCKET_URL=${WEB_SOCKET_URL}
ENV VITE_UNIVERSAL_LOGIN_URL=${UNIVERSAL_LOGIN_URL}

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
