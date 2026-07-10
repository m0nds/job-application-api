# Start from official Node 20 image (slim = smaller size)
FROM node:20-alpine

# Install OpenSSL — required by Prisma
RUN apk add --no-cache openssl

# Set working directory inside container
WORKDIR /app

# Copy package files first (Docker layer caching — faster rebuilds)
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci

# Generate Prisma client
RUN npx prisma generate

# Copy rest of source code
COPY . .

# Build TypeScript
RUN npm run build

# Expose port
EXPOSE 3000

# Start the app
CMD ["node", "dist/server.js"]