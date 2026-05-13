#!/bin/bash
set -e

MODE=${1:-debug}
ARCH=${2:-arm64-v8a}  # device réel : arm64-v8a | émulateur x86_64 : x86_64

cd "$(dirname "$0")/android"

if [ "$MODE" = "release" ]; then
  echo "Building RELEASE APK..."
  ./gradlew assembleRelease -PreactNativeArchitectures=$ARCH
  APK_PATH="app/build/outputs/apk/release/app-release.apk"
else
  echo "Building DEBUG APK (arch: $ARCH)..."
  ./gradlew assembleDebug -PreactNativeArchitectures=$ARCH
  APK_PATH="app/build/outputs/apk/debug/app-debug.apk"
fi

echo ""
echo "APK: android/$APK_PATH"

# Installe automatiquement si un device/émulateur est connecté
if adb devices | grep -q "device$"; then
  echo "Device detecte — installation..."
  adb install -r "$APK_PATH"
  echo "Installation OK"
else
  echo "Aucun device connecte. Lance l'emulateur ou branche ton telephone."
fi
