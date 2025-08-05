ARG NODE_VERSION=20.15
ARG PNPM_VERSION=9.5

FROM node:${NODE_VERSION}-alpine as base

WORKDIR /usr/src/app
RUN --mount=type=cache,target=/root/.npm \
    npm install -g pnpm@${PNPM_VERSION}


# Build client
FROM base as client-deps

COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

FROM client-deps as client-build

# Set environment variables for client build
ARG VITE_API_BASE_URL
ARG VITE_API_WEB_SOCKET_URL
ARG VITE_API_HASURA_BASE_URL
ARG VITE_UNIVERSAL_LOGIN_URL
ARG VITE_SOCKET_IO_SERVER_URL

ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_API_WEB_SOCKET_URL=$VITE_API_WEB_SOCKET_URL
ENV VITE_API_HASURA_BASE_URL=$VITE_API_HASURA_BASE_URL
ENV VITE_UNIVERSAL_LOGIN_URL=$VITE_UNIVERSAL_LOGIN_URL
ENV VITE_SOCKET_IO_SERVER_URL=$VITE_SOCKET_IO_SERVER_URL

COPY . .
RUN pnpm run build


# Build server
FROM base as server-deps

WORKDIR /usr/src/app/socket-io-server
COPY socket-io-server/package.json socket-io-server/pnpm-lock.yaml ./
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --prod --frozen-lockfile

FROM server-deps as server-build

COPY socket-io-server ./
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile && \
    pnpm run build


# Final image
FROM base as final

ENV NODE_ENV production
USER node

WORKDIR /usr/src/app

# Copy server files
COPY socket-io-server/package.json ./
COPY --from=server-deps /usr/src/app/socket-io-server/node_modules ./node_modules
COPY --from=server-build /usr/src/app/socket-io-server/dist ./dist

# Copy client static files to public directory
COPY --from=client-build /usr/src/app/dist ./public

EXPOSE 3000
CMD ["pnpm", "start"]