#!/usr/bin/env bash
# Deploy TrailOPS to its existing Cloud Run service WITHOUT a container build.
#
# The AI Studio-managed Google Cloud project blocks Artifact Registry, so
# `gcloud run deploy --source .` (which builds an image) is refused. Instead, like
# AI Studio itself, this builds the web app and a single-file server here, then
# uploads them onto the service's own Node.js base image (--no-build).
#
# Usage (in Cloud Shell, signed in to the account that owns the service):
#   cd ~/trail-ops && git pull && bash scripts/deploy-cloud-run.sh
set -euo pipefail

SERVICE="${SERVICE:-trailops-ui-builder}"
PROJECT="${PROJECT:-fluid-scarab-7zbz0}"
REGION="${REGION:-asia-southeast1}"
STAGE="$(mktemp -d)"
cd "$(dirname "$0")/.."

echo "==> Installing dependencies"
npm install --no-audit --no-fund --legacy-peer-deps --loglevel=error

echo "==> Building the web app"
npx vite build

echo "==> Bundling the server into one file"
npx esbuild server.ts --bundle --platform=node --format=esm --target=node20 \
  --outfile="$STAGE/server.js" --external:vite \
  --define:process.env.NODE_ENV='"production"' \
  --banner:js="import { createRequire as __cr } from 'module'; const require = __cr(import.meta.url);" \
  --log-level=warning
cp -R dist "$STAGE/dist"
cat > "$STAGE/package.json" <<'PKG'
{ "name": "trailops", "private": true, "type": "module", "scripts": { "start": "node server.js" } }
PKG

echo "==> Reading the service's current Node.js base image"
BASE_IMAGE="$(gcloud run services describe "$SERVICE" --project "$PROJECT" --region "$REGION" --format=json \
  | jq -r '.spec.template.metadata.annotations["run.googleapis.com/base-images"] // empty | fromjson | to_entries[0].value // empty')"
BASE_IMAGE="${BASE_IMAGE:-nodejs22}"
echo "    base image: $BASE_IMAGE"

GCLOUD=(gcloud)
if ! gcloud run deploy --help 2>/dev/null | grep -q -- '--no-build'; then
  if gcloud beta run deploy --help 2>/dev/null | grep -q -- '--no-build'; then
    GCLOUD=(gcloud beta)
  else
    echo "ERROR: this gcloud has no --no-build option. Run: gcloud components update   (then re-run this script)" >&2
    exit 1
  fi
fi

echo "==> Deploying to $SERVICE ($PROJECT, $REGION). The existing start command runs server.js."
"${GCLOUD[@]}" run deploy "$SERVICE" --source "$STAGE" --no-build --base-image "$BASE_IMAGE" \
  --project "$PROJECT" --region "$REGION" --quiet

echo "==> Done. Live URL:"
gcloud run services describe "$SERVICE" --project "$PROJECT" --region "$REGION" --format='value(status.url)'
