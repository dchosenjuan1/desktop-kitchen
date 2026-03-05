#!/bin/bash
# Build a signed release AAB for Google Play Store upload
#
# Prerequisites:
#   1. Run scripts/generate-keystore.sh first (one-time)
#   2. Set environment variables:
#      export KEYSTORE_PASSWORD="your-keystore-password"
#      export KEY_PASSWORD="your-key-password"
#
# Output: app/build/outputs/bundle/release/app-release.aab

set -e

cd "$(dirname "$0")/.."

# Validate env vars
if [ -z "$KEYSTORE_PASSWORD" ] || [ -z "$KEY_PASSWORD" ]; then
    echo "ERROR: KEYSTORE_PASSWORD and KEY_PASSWORD must be set"
    echo ""
    echo "Usage:"
    echo "  export KEYSTORE_PASSWORD=\"your-password\""
    echo "  export KEY_PASSWORD=\"your-password\""
    echo "  ./scripts/build-release.sh"
    exit 1
fi

# Validate keystore exists
if [ ! -f "app/keystore/release.keystore" ]; then
    echo "ERROR: Keystore not found at app/keystore/release.keystore"
    echo "Run scripts/generate-keystore.sh first."
    exit 1
fi

echo "Building release AAB..."
./gradlew clean bundleRelease

AAB_PATH="app/build/outputs/bundle/release/app-release.aab"
if [ -f "$AAB_PATH" ]; then
    SIZE=$(du -h "$AAB_PATH" | cut -f1)
    echo ""
    echo "Release AAB built successfully!"
    echo "  Path: $AAB_PATH"
    echo "  Size: $SIZE"
    echo ""
    echo "Upload this file to Google Play Console:"
    echo "  https://play.google.com/console"
else
    echo "ERROR: AAB not found at expected path"
    exit 1
fi
