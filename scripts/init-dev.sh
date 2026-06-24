#!/bin/bash
# NSO Kryptonite Platform — Development Environment Setup
# Usage: ./scripts/init-dev.sh

set -e

echo "=========================================="
echo "NSO Kryptonite Platform — Dev Setup"
echo "=========================================="

# Check prerequisites
echo "[*] Checking prerequisites..."

command -v node >/dev/null 2>&1 || { echo "❌ Node.js 20+ required"; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "❌ Docker required"; exit 1; }
command -v docker-compose >/dev/null 2>&1 || { echo "❌ Docker Compose required"; exit 1; }

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    echo "❌ Node.js 20+ required (found $(node -v))"
    exit 1
fi

echo "✓ Node.js $(node -v)"
echo "✓ Docker $(docker -v)"
echo "✓ Docker Compose $(docker-compose -v)"

# Install dependencies
echo ""
echo "[*] Installing dependencies..."
npm install

# Set up environment
echo ""
echo "[*] Setting up environment..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo "✓ Created .env from example (edit with your values)"
else
    echo "✓ .env already exists"
fi

# Start infrastructure
echo ""
echo "[*] Starting infrastructure services..."
docker-compose -f ops/docker/dev.compose.yml up -d mysql redis elasticsearch

# Wait for services
echo ""
echo "[*] Waiting for services to be ready..."
sleep 10

# Push database schema
echo ""
echo "[*] Pushing database schema..."
npm run db:push

# Done
echo ""
echo "=========================================="
echo "✓ Development environment ready!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "  1. Edit .env with your configuration"
echo "  2. Start dev server: npm run dev"
echo "  3. Open http://localhost:3000"
echo "  4. Review docs/OPERATOR.md for usage"
echo ""
echo "Services:"
echo "  API:       http://localhost:3000"
echo "  MySQL:     localhost:3306"
echo "  Redis:     localhost:6379"
echo "  Elastic:   http://localhost:9200"
echo ""
