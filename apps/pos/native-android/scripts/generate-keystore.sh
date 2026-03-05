#!/bin/bash
# Generate a release signing keystore for Google Play Store
#
# IMPORTANT: Back up the generated keystore file securely.
# If you lose it, you cannot update the app on the Play Store.

set -e

KEYSTORE_DIR="$(dirname "$0")/../app/keystore"
KEYSTORE_PATH="$KEYSTORE_DIR/release.keystore"
KEY_ALIAS="desktop-kitchen-pos"

mkdir -p "$KEYSTORE_DIR"

if [ -f "$KEYSTORE_PATH" ]; then
    echo "Keystore already exists at $KEYSTORE_PATH"
    echo "Delete it first if you want to regenerate."
    exit 1
fi

echo "Generating release keystore..."
echo ""

keytool -genkey -v \
    -keystore "$KEYSTORE_PATH" \
    -alias "$KEY_ALIAS" \
    -keyalg RSA \
    -keysize 2048 \
    -validity 10000 \
    -storepass:env KEYSTORE_PASSWORD \
    -keypass:env KEY_PASSWORD \
    -dname "CN=Desktop Kitchen, OU=Engineering, O=Desktop Kitchen, L=Mexico City, ST=CDMX, C=MX"

echo ""
echo "Keystore generated at: $KEYSTORE_PATH"
echo "Key alias: $KEY_ALIAS"
echo ""
echo "IMPORTANT: Back up this keystore file and passwords securely!"
echo "Required env vars for building:"
echo "  KEYSTORE_PASSWORD=<your-keystore-password>"
echo "  KEY_PASSWORD=<your-key-password>"
