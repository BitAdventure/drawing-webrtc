ARG NODE_VERSION=20.15
ARG PNPM_VERSION=9.5

FROM node:${NODE_VERSION}-alpine as base

WORKDIR /usr/src/app
RUN --mount=type=cache,target=/root/.npm \
    npm install -g pnpm@${PNPM_VERSION}


FROM base as deps

RUN --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=pnpm-lock.yaml,target=pnpm-lock.yaml \
    --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --prod --frozen-lockfile


FROM deps as build

ARG SERVER_URL
ARG API_BASE_URL
ARG HASURA_BASE_URL
ARG WEB_SOCKET_URL
ARG UNIVERSAL_LOGIN_URL

ENV VITE_SERVER_URL=${SERVER_URL}
ENV VITE_API_BASE_URL=${API_BASE_URL}
ENV VITE_HASURA_BASE_URL=${HASURA_BASE_URL}
ENV VITE_WEB_SOCKET_URL=${WEB_SOCKET_URL}
ENV VITE_UNIVERSAL_LOGIN_URL=${UNIVERSAL_LOGIN_URL}

RUN --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=pnpm-lock.yaml,target=pnpm-lock.yaml \
    --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

COPY . .
RUN pnpm run build

FROM base as final

ENV NODE_ENV production
USER node
COPY package.json .
COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/dist ./dist
EXPOSE 3000
CMD pnpm start
