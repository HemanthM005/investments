# Build APK with Online Service (No Local Setup)

## Option 1: Android App Bundle (Simplest)
Use **App Maker** or similar online services:

1. Go to https://pwa2apk.com or https://www.appmaker.xyz
2. Enter your app URL: `https://investments-five-snowy.vercel.app`
3. Set app name: "Investment Portfolio"
4. Choose Android
5. Download APK
6. Share with users

**Time:** 2-3 minutes
**Setup:** Zero (just a web form)

## Option 2: Pre-built Wrapper (Fastest)
If you want to keep Capacitor structure but avoid local build:

Use a CI/CD service like:
- **EAS Build** (from Expo): Push to GitHub → builds in cloud → download APK
- **Codemagic**: Similar, integrates with GitHub
- **GitHub Actions**: Free tier available

Instructions:
1. Commit everything to GitHub (already done ✓)
2. Set up EAS or Codemagic account
3. Connect your GitHub repo
4. Click "Build" → APK ready in 2-3 minutes
5. Download and distribute

## Option 3: Docker (If daemon is running)
```bash
docker run --rm -v "$(pwd):/workspace" -w "/workspace/android" \
  circleci/android:api-34-node \
  sh -c "./gradlew assembleRelease"
```

## Recommendation
**Use Option 1** (online APK builder) if you want it done in 3 minutes with zero setup.

---

### APK File Location (after building)
```
android/app/build/outputs/apk/release/app-release.apk
```

### To Install on Android Phone
1. Download APK to phone
2. Go to Settings > Security > Allow Installation from Unknown Sources
3. Open file manager, tap APK
4. Install
5. App connects to Vercel automatically ✓

### To Distribute
Upload APK to cloud storage (Google Drive, Dropbox, AWS S3) and share the link.
