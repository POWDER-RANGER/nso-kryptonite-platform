# NSO Kryptonite Platform — API Server Dockerfile

# --- Development Stage ---
FROM node:20-alpine AS development
WORKDIR /app

# Install dependencies (including dev)
COPY package*.json ./
RUN npm ci

# Copy source
COPY . .

# Expose dev server port
EXPOSE 3000

CMD ["npm", "run", "dev"]

# --- Production Stage ---
FROM node:20-alpine AS production
WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy built application
COPY dist/ ./dist/
COPY api/ ./api/
COPY contracts/ ./contracts/
COPY db/ ./db/

# Non-root user
RUN addgroup -g 1001 -S kryptonite && \
    adduser -S kryptonite -u 1001
USER kryptonite

EXPOSE 3000

CMD ["node", "dist/server.js"]
