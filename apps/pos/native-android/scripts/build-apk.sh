#!/bin/bash
# Build a signed release APK for sideloading / direct installation
#
# Prerequisites:
#   1. Run scripts/generate-keystore.sh first (one-time)
#   2. Set environment variables:
#      export KEYSTORE_PASSWORD="your-keystore-password"
#      export KEY_PASSWORD="your-key-password"
#
# Output: app/build/outputs/apk/release/app-release.apk

set -e

cd "$(dirname "$0")/.."

# Validate env vars
if [ -z "$KEYSTORE_PASSWORD" ] || [ -z "$KEY_PASSWORD" ]; then
    echo "ERROR: KEYSTORE_PASSWORD and KEY_PASSWORD must be set"
    echo ""
    echo "Usage:"
    echo "  export KEYSTORE_PASSWORD=\"your-password\""
    echo "  export KEY_PASSWORD=\"your-password\""
    echo "  ./scripts/build-apk.sh"
    exit 1
fi

if [ ! -f "app/keystore/release.keystore" ]; then
    echo "ERROR: Keystore not found. Run scripts/generate-keystore.sh first."
    exit 1
fi

echo "Building release APK..."
./gradlew clean assembleRelease

APK_PATH="app/build/outputs/apk/release/app-release.apk"
if [ -f "$APK_PATH" ]; then
    SIZE=$(du -h "$APK_PATH" | cut -f1)
    echo ""
    echo "Release APK built successfully!"
    echo "  Path: $APK_PATH"
    echo "  Size: $SIZE"
    echo ""
    echo "Install on a connected device:"
    echo "  adb install $APK_PATH"
else
    echo "ERROR: APK not found at expected path"
    exit 1
fi
