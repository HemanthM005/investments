#!/usr/bin/env bash
# Builds the Android APK. Requires:
#   brew install openjdk@21
#   brew install --cask android-commandlinetools
set -euo pipefail

export JAVA_HOME=/opt/homebrew/opt/openjdk@21
export ANDROID_HOME=/opt/homebrew/share/android-commandlinetools
export ANDROID_SDK_ROOT="$ANDROID_HOME"

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# local.properties is gitignored, so recreate it if missing
[ -f android/local.properties ] || echo "sdk.dir=$ANDROID_HOME" > android/local.properties

npx cap sync android

VARIANT="${1:-debug}"
case "$VARIANT" in
  debug)   TASK=assembleDebug;   OUT=android/app/build/outputs/apk/debug/app-debug.apk ;;
  release) TASK=assembleRelease; OUT=android/app/build/outputs/apk/release/app-release-unsigned.apk ;;
  *) echo "usage: $0 [debug|release]" >&2; exit 1 ;;
esac

(cd android && ./gradlew "$TASK")

cp "$OUT" "$HOME/Desktop/InvestmentApp.apk"
echo "APK -> $HOME/Desktop/InvestmentApp.apk"
