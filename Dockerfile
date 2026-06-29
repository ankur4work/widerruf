FROM node:18-alpine

ARG SHOPIFY_API_KEY
ENV SHOPIFY_API_KEY=$SHOPIFY_API_KEY
ENV NODE_ENV=production
# Cap V8 heap so the rollup/Polaris build stays within RAM on the shared server.
ENV NODE_OPTIONS=--max-old-space-size=2048

EXPOSE 3000
WORKDIR /app

# Prisma needs openssl on alpine
RUN apk add --no-cache openssl

COPY package.json package-lock.json* ./

# Install deps WITHOUT postinstall scripts first. Running every package's
# postinstall at once (esbuild + prisma engine native binaries together) spikes
# memory and OOM-hangs the build on this shared server. Splitting avoids that.
RUN npm install --include=dev --ignore-scripts --no-audit --no-fund

# Now run the Prisma engine setup in isolation (low memory) -> generates client.
RUN npm install prisma @prisma/client --include=dev --foreground-scripts --no-audit --no-fund

COPY . .

# Build (prisma generate + remix vite build). esbuild resolves its musl binary
# from the installed @esbuild/linux-musl-x64 package (no postinstall needed).
RUN npm run build

# Run migrations then start the server
CMD ["npm", "run", "docker-start"]
