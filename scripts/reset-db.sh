#!/usr/bin/env bash
# Reset database: push schema + reseed demo data + reindex Meilisearch
# Usage: ./scripts/reset-db.sh
set -euo pipefail

echo "=== Lumina Database Reset ==="
echo ""

# Confirm
read -p "This will DROP all data and reseed. Continue? [y/N] " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Aborted."
  exit 0
fi

echo ""
echo "Step 1/3: Pushing schema..."
yarn db:push

echo ""
echo "Step 2/3: Seeding demo data..."
yarn workspace @lumina/db seed

echo ""
echo "Step 3/3: Indexing into Meilisearch..."
yarn workspace @lumina/db index || echo "  (Meilisearch not available — search will use DB fallback)"

echo ""
echo "=== Done! Database reset and seeded. ==="
