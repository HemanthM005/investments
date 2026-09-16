# Investment Portfolio App - Project Status

## ✅ COMPLETED & WORKING

### Core Application
- **Framework**: Next.js 15 + App Router + TypeScript
- **Deployment**: Live on Vercel at https://investments-five-snowy.vercel.app
- **Database**: JSON files (data/*.json) with localStorage fallback
- **Styling**: TailwindCSS dark theme
- **State Management**: Zustand stores

### Features Implemented & Working
1. **Investment Portfolio** - Track stocks, crypto, ETFs, mutual funds, gold
2. **Daily Expense Tracker** - With split bills and auto-account deduction
3. **Cash & Accounts Manager** - Balance tracking, transfers
4. **Money Tracker** - Lent/borrowed tracking per person
5. **Subscriptions** - Recurring expense tracking
6. **Habit Tracker** - Daily habit streaks
7. **Daily Planner** - Task scheduling
8. **India Sectors Report** - Emerging sectors research
9. **Stock Analysis** - AI-powered (via Groq API)

### Message Parser (SMS/Google Pay Integration)
- **Status**: ✅ WORKING
- **Location**: `/app/api/parse-message` & `/app/message-parser` page
- **LLM**: Groq API (openai/gpt-oss-120b model)
- **Functionality**:
  - Parses SMS text input
  - Extracts: amount, date, category, person, payment method, account
  - Confidence scoring
  - Approval workflow (pending → approve/reject → import)
  - Auto-routes to correct expense/transaction type

**Test Results**:
```
Input: "Google Pay: You paid Rupesh 500 for dinner on 15 Sep 2026"
Output: {
  "type": "payment",
  "amount": 500,
  "currency": "INR",
  "date": "2026-09-15",
  "category": "Food",
  "person_name": "Rupesh",
  "payment_method": "UPI",
  "account_name": "GooglePay",
  "confidence": 1
}
```

## ✅ APK BUILDING — RESOLVED (2026-09-16)

### What was actually wrong
Earlier attempts tried to force Capacitor 8 down to **Java 11 / AGP 7.4.2**. That was the wrong
direction: Capacitor 8 with `compileSdk 36` *requires* Java 21 and AGP 8.x, so every downgrade
just moved the error somewhere else. The real blocker was much simpler — **no Android SDK was
installed on the machine**, and the only JDK present was a Java 8 applet-plugin JRE.

### The working setup (macOS, Apple Silicon)
```bash
brew install openjdk@21                          # Capacitor 8 needs JDK 21
brew install --cask android-commandlinetools     # ~500MB, no Android Studio needed

export JAVA_HOME=/opt/homebrew/opt/openjdk@21
export ANDROID_HOME=/opt/homebrew/share/android-commandlinetools
export ANDROID_SDK_ROOT=$ANDROID_HOME

yes | sdkmanager --licenses
sdkmanager "platform-tools" "platforms;android-36" "build-tools;36.0.0"
echo "sdk.dir=$ANDROID_HOME" > android/local.properties   # gitignored
```

### Config corrections applied
| File | Change |
|------|--------|
| `android/build.gradle` | AGP `7.4.2` → `8.13.0` |
| `android/app/capacitor.build.gradle` | reverted to `JavaVersion.VERSION_21` (generated file — do not hand-edit) |
| `android/capacitor-cordova-android-plugins/build.gradle` | reverted to AGP 8.13.0 + `VERSION_21` |
| `android/gradle.properties` | `org.gradle.jvmargs` `-Xmx1536m` → `-Xmx4096m` |

Gradle wrapper stays at **8.14.3** (already correct — it supports AGP 8.13 on JDK 21).

### Building
```bash
./scripts/build-apk.sh            # debug APK  → ~/Desktop/InvestmentApp.apk
./scripts/build-apk.sh release    # unsigned release APK (needs signing before Play Store)
```

The debug APK is signed with the Android debug key, so it installs directly on a phone via
sideload — no Play Store, no signing config needed.

### Verified output
```
android/app/build/outputs/apk/debug/app-debug.apk   13 MB
applicationId: com.investments.app
minSdk: 24   targetSdk: 36
BUILD SUCCESSFUL in 1m 6s (157 tasks)
```

### Note on what the APK contains
`capacitor.config.ts` sets `server.url` to the Vercel deployment, so the APK is a **thin native
shell that loads the live web app**. Shipping app changes does not require rebuilding the APK —
just deploy to Vercel. Rebuild the APK only when native config, plugins, icons, or the app ID change.

### Installing on the phone
1. USB: `adb install -r ~/Desktop/InvestmentApp.apk` (adb is at `$ANDROID_HOME/platform-tools/adb`)
2. Or copy the `.apk` to the phone and tap it — enable "Install unknown apps" for the file manager.

## 📋 CURRENT STATE

### What Users Get
1. **Web App** (Primary): https://investments-five-snowy.vercel.app
   - All features working
   - Message parser working
   - Real-time price updates
   - Full data persistence
   
2. **Android APK** (working): `./scripts/build-apk.sh` → `~/Desktop/InvestmentApp.apk`
   - Sideload via `adb install -r` or by tapping the file on the phone

3. **Mobile Web**: Open in phone browser → "Add to Home Screen"

### Files & Configuration
- **Capacitor Config**: `capacitor.config.ts` → points to Vercel URL
- **Message Parser Endpoint**: `/app/api/parse-message`
- **Groq API Key**: Set on Vercel environment variables
- **Android Files**: `android/` directory with Capacitor setup — builds to APK via `scripts/build-apk.sh`

## 🔧 APK TROUBLESHOOTING

**Rule of thumb: match the toolchain to Capacitor, never the reverse.** Capacitor regenerates
`capacitor.build.gradle` on every `cap sync`, so any hand-edit to the Java version there is
overwritten. If the Java version is wrong, change the JDK you build with — not the generated file.

| Symptom | Fix |
|---------|-----|
| `SDK location not found` | `android/local.properties` missing — the build script recreates it |
| `Unsupported class file major version` | Wrong `JAVA_HOME`; must be JDK 21 |
| `compileSdk 36 requires AGP 8.x` | AGP was downgraded in `android/build.gradle`; restore `8.13.0` |
| `You have not accepted the license` | `yes \| sdkmanager --licenses` |
| Gradle OOM | raise `org.gradle.jvmargs` in `android/gradle.properties` |

### Rejected approaches (and why)
- **EAS Build** — Expo's Android images assume an Expo/RN project; forcing a Capacitor app through
  them means fighting a JDK the build server picks. Local builds are faster and fully controllable.
  (`eas-cli` and `app.json` are leftovers from this attempt and can be removed.)
- **Android Studio** — works, but is ~2GB for an IDE that is never opened. The command-line tools
  provide the identical build.
- **React Native / Flutter rewrite** — an entire rewrite to solve a missing-SDK problem.

### iOS (next)
`@capacitor/ios` is in `package.json` but the `ios/` project has **not** been generated yet.
When Android is settled: `npx cap add ios`, then build in Xcode. On-device installs need Xcode
plus an Apple Developer account. Same thin-shell setup, pointed at the same Vercel URL.

## 📊 Technology Stack

```
Frontend:
- Next.js 15 (App Router)
- TypeScript
- TailwindCSS
- Zustand (state)
- Recharts (charts)
- Radix UI (components)
- Lucide React (icons)

Backend/APIs:
- Next.js API Routes
- Groq API (message parsing, stock analysis)
- CoinGecko API (crypto prices)
- Yahoo Finance (stock prices)

Mobile:
- Capacitor (web→native wrapper)
- Android SDK 36 + JDK 21 + AGP 8.13 (APK builds locally)

Hosting:
- Vercel (production)
- GitHub (source control)
```

## 📝 For Next Developer

- The web app on Vercel is the source of truth; the APK is a thin shell around it.
- App-logic changes ship by deploying to Vercel — **no APK rebuild needed**.
- Rebuild the APK only for native changes: plugins, icons, app ID, permissions, `capacitor.config.ts`.
- Never hand-edit `android/app/capacitor.build.gradle` — `cap sync` regenerates it.
- Message parser is solid - Groq API works great
- All data models and stores are in place

---

**Status**: Web app deployed; Android APK builds and installs  
**Last Updated**: 2026-09-16  
**Deployed URL**: https://investments-five-snowy.vercel.app
