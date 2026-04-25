#!/usr/bin/env bash
# Seed demo data (clears existing data first, then inserts fresh demo state)
# Usage: ./scripts/seed-demo.sh
set -euo pipefail

echo "=== Lumina Demo Seed ==="
echo ""
echo "Step 1/2: Seeding database..."
yarn workspace @lumina/db seed

echo ""
echo "Step 2/2: Indexing listings into Meilisearch..."
yarn workspace @lumina/db index || echo "  (Meilisearch not available — search will use DB fallback)"

echo ""
echo "=== Done! Demo data ready. ==="
echo ""
echo "Quick start:"
echo "  1. Open http://localhost:3000"
echo "  2. Login as guest@lumina.dev / admin123"
echo "  3. Browse listings, try booking, check scenarios"
