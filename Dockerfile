FROM node:18-alpine

ARG SHOPIFY_API_KEY
ENV SHOPIFY_API_KEY=$SHOPIFY_API_KEY
ENV NODE_ENV=production
EXPOSE 3000
WORKDIR /app

# Prisma needs openssl on alpine
RUN apk add --no-cache openssl

COPY package.json package-lock.json* ./
# Install with devDeps so the Vite/Remix build works
RUN npm install --include=dev

COPY . .
RUN npm run build

# Run migrations then start the server
CMD ["npm", "run", "docker-start"]
