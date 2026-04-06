# Android Native Build Guide
### FieldSales App — Full CLI Setup on Linux / Replit Container

> **Target:** Debug APK for testing + Release AAB for Google Play  
> **Environment:** Linux (NixOS/Ubuntu/Debian) — no Android Studio required  
> **Capacitor version:** 8.x  
> **App ID:** `com.dmllabs.fieldsales`

---

## Table of Contents

1. [Prerequisites Overview](#1-prerequisites-overview)
2. [Install Java JDK 17](#2-install-java-jdk-17)
3. [Install Android Command Line Tools](#3-install-android-command-line-tools)
4. [Set Permanent Environment Variables](#4-set-permanent-environment-variables)
5. [Install Android SDK Components](#5-install-android-sdk-components)
6. [Verify the Full Toolchain](#6-verify-the-full-toolchain)
7. [Add Android Platform to Capacitor](#7-add-android-platform-to-capacitor)
8. [Configure AndroidManifest.xml — All Permissions](#8-configure-androidmanifestxml--all-permissions)
9. [Configure local.properties](#9-configure-localproperties)
10. [Configure Gradle Memory](#10-configure-gradle-memory)
11. [Add App Icons](#11-add-app-icons)
12. [Add Splash Screen Resources](#12-add-splash-screen-resources)
13. [Build Debug APK](#13-build-debug-apk)
14. [Install Debug APK on Device via ADB](#14-install-debug-apk-on-device-via-adb)
15. [Generate Release Keystore](#15-generate-release-keystore)
16. [Configure Release Signing in Gradle](#16-configure-release-signing-in-gradle)
17. [Build Release APK and AAB](#17-build-release-apk-and-aab)
18. [Re-sync After Code Changes](#18-re-sync-after-code-changes)
19. [Plugin-Specific Notes](#19-plugin-specific-notes)
20. [Troubleshooting](#20-troubleshooting)

---

## 1. Prerequisites Overview

| Tool | Required Version | Purpose |
|---|---|---|
| Java JDK | **21 (LTS)** | Gradle and Android build system |
| Android Command Line Tools | Latest (12.0+) | SDK manager, no Android Studio |
| Android SDK Platform | API 36 (Android 16) | Compile target |
| Android Build Tools | 35.0.0 | APK/AAB assembler |
| Android Platform Tools | Latest | ADB for device install |
| Node.js | 20+ (already on Replit: 24) | Capacitor CLI |
| pnpm | 10+ (already on Replit) | Package manager |

---

## 2. Install Java JDK 21

> **Why JDK 21?** The `@capacitor/filesystem` plugin (and several other Capacitor plugins at v8.x)
> set `sourceCompatibility = JavaVersion.VERSION_21` in their Gradle config. Building with JDK 17
> will fail with "Cannot find a Java installation matching languageVersion=21".

### Option A — Replit / NixOS (recommended for this environment)

Edit `replit.nix` in the project root to add JDK 21 and ADB:

```nix
{ pkgs }: {
  deps = [
    pkgs.nodejs_20
    pkgs.nodePackages.pnpm
    pkgs.jdk21
    pkgs.android-tools
  ];
}
```

After saving, Replit reloads the environment automatically.

Verify:
```bash
java -version
# Expected: openjdk version "21.x.x"

javac -version
# Expected: javac 21.x.x
```

### Option B — Ubuntu / Debian (standard Linux server)

```bash
sudo apt-get update
sudo apt-get install -y openjdk-21-jdk openjdk-21-jre

# Set JAVA_HOME
export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64
java -version
```

### Option C — Any Linux (manual download)

```bash
# Download JDK 21 from Adoptium
curl -L https://github.com/adoptium/temurin21-binaries/releases/download/jdk-21.0.5%2B11/OpenJDK21U-jdk_x64_linux_hotspot_21.0.5_11.tar.gz \
  -o /tmp/jdk21.tar.gz

mkdir -p ~/jdk21
tar -xzf /tmp/jdk21.tar.gz -C ~/jdk21 --strip-components=1

export JAVA_HOME=~/jdk21
export PATH=$JAVA_HOME/bin:$PATH

java -version
```

---

## 3. Install Android Command Line Tools

Do NOT download Android Studio. Use the standalone command line tools only.

```bash
# Create the SDK directory structure
mkdir -p ~/android-sdk/cmdline-tools

# Download the latest command line tools
# Check for the latest version at: https://developer.android.com/studio#command-line-tools-only
curl -L https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip \
  -o /tmp/cmdline-tools.zip

# Extract into the correct folder structure
unzip /tmp/cmdline-tools.zip -d /tmp/cmdtools-tmp
mkdir -p ~/android-sdk/cmdline-tools/latest
mv /tmp/cmdtools-tmp/cmdline-tools/* ~/android-sdk/cmdline-tools/latest/

# Clean up
rm -rf /tmp/cmdline-tools.zip /tmp/cmdtools-tmp

# Verify
ls ~/android-sdk/cmdline-tools/latest/bin/
# Should show: apkanalyzer  avdmanager  lint  retrace  sdkmanager
```

> **Why the `latest/` folder matters:** Android's sdkmanager requires the tools to live at
> `$ANDROID_HOME/cmdline-tools/latest/` — any other folder name will cause "sdkmanager not found" errors.

---

## 4. Set Permanent Environment Variables

Add these to your shell profile so they survive terminal restarts.

### For Replit / bash

```bash
cat >> ~/.bashrc << 'EOF'

# ── Android SDK ──────────────────────────────────────────
export ANDROID_HOME=$HOME/android-sdk
export ANDROID_SDK_ROOT=$HOME/android-sdk
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64   # adjust if using Option A or C above
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/build-tools/35.0.0
export PATH=$JAVA_HOME/bin:$PATH
# ─────────────────────────────────────────────────────────
EOF

# Apply immediately
source ~/.bashrc
```

> If using Option A (NixOS), `JAVA_HOME` is managed by Nix — omit that line and just add the Android paths.

Verify all paths are set:
```bash
echo $ANDROID_HOME    # should print ~/android-sdk expanded path
echo $JAVA_HOME       # should print JDK path
which sdkmanager      # should print a path
```

---

## 5. Install Android SDK Components

```bash
# Accept all licenses non-interactively
yes | sdkmanager --licenses

# Install all required components
sdkmanager \
  "platform-tools" \
  "platforms;android-35" \
  "build-tools;35.0.0" \
  "cmdline-tools;latest"

# Verify installation
sdkmanager --list_installed
```

Expected output should include:
```
build-tools;35.0.0
cmdline-tools;latest
platform-tools
platforms;android-35
```

---

## 6. Verify the Full Toolchain

Run this before proceeding. Every line must succeed:

```bash
java -version           # OpenJDK 21
javac -version          # javac 21
sdkmanager --version    # 12.0 or higher
adb version             # Android Debug Bridge 35.x
echo $ANDROID_HOME      # non-empty path
echo $JAVA_HOME         # non-empty path
```

If any fail, go back to the relevant step above.

---

## 7. Add Android Platform to Capacitor

Run all commands from the `artifacts/field-sales/` directory:

```bash
cd /home/runner/workspace/artifacts/field-sales

# Step 1: Build the web assets for native (sets CAPACITOR_BUILD=true)
pnpm build:native

# Step 2: Add the Android platform (generates the android/ folder)
# Only run this ONCE — it creates the native project
npx cap add android

# Step 3: Sync web assets and all plugin configurations into android/
npx cap sync android
```

After this you will have an `artifacts/field-sales/android/` directory containing
a full Gradle/Android project.

> **`pnpm sync:android`** (the existing npm script) combines steps 1+3 above.
> Use it for all future syncs after the initial `cap add android`.

---

## 8. Configure AndroidManifest.xml — All Permissions

Every Capacitor plugin used in this app requires specific Android permissions.
Edit this file:

```
artifacts/field-sales/android/app/src/main/AndroidManifest.xml
```

Add all of the following permissions inside the `<manifest>` tag,
**before** the `<application>` tag:

```xml
<!-- ── NETWORK ─────────────────────────────────────────────────────── -->
<!-- @capacitor/network, fetch/sync calls to API server -->
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

<!-- ── CAMERA ──────────────────────────────────────────────────────── -->
<!-- @capacitor/camera + @capacitor-mlkit/barcode-scanning -->
<uses-permission android:name="android.permission.CAMERA" />
<uses-feature android:name="android.hardware.camera" android:required="false" />
<uses-feature android:name="android.hardware.camera.autofocus" android:required="false" />

<!-- ── STORAGE ─────────────────────────────────────────────────────── -->
<!-- @capacitor/filesystem, @capacitor/camera gallery pick -->
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE"
    android:maxSdkVersion="32" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE"
    android:maxSdkVersion="29" />
<!-- Android 13+ media access -->
<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
<uses-permission android:name="android.permission.READ_MEDIA_VIDEO" />

<!-- ── LOCATION ────────────────────────────────────────────────────── -->
<!-- @capacitor/geolocation — visit GPS capture -->
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />

<!-- ── NOTIFICATIONS ───────────────────────────────────────────────── -->
<!-- @capacitor/local-notifications — reminder alerts -->
<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
<uses-permission android:name="android.permission.VIBRATE" />
<uses-permission android:name="android.permission.WAKE_LOCK" />
<!-- Android 13+ (API 33+) explicit notification permission -->
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" />

<!-- ── BIOMETRIC ───────────────────────────────────────────────────── -->
<!-- capacitor-native-biometric — PIN lock + fingerprint/face unlock -->
<uses-permission android:name="android.permission.USE_BIOMETRIC" />
<uses-permission android:name="android.permission.USE_FINGERPRINT" />

<!-- ── HAPTICS ─────────────────────────────────────────────────────── -->
<!-- @capacitor/haptics -->
<uses-permission android:name="android.permission.VIBRATE" />

<!-- ── APP BADGE ───────────────────────────────────────────────────── -->
<!-- @capawesome/capacitor-badge -->
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
```

Also inside the `<activity>` tag, add screen orientation lock:

```xml
<activity
    android:name=".MainActivity"
    android:screenOrientation="portrait"
    ...>
```

---

## 9. Configure local.properties

Gradle needs to know where the Android SDK is.
Create this file if it doesn't exist:

```bash
echo "sdk.dir=$HOME/android-sdk" > \
  /home/runner/workspace/artifacts/field-sales/android/local.properties
```

Verify the path is correct:
```bash
cat artifacts/field-sales/android/local.properties
# Expected: sdk.dir=/home/runner/android-sdk
```

---

## 10. Configure Gradle Memory

On a Linux container with limited RAM, increase the JVM heap to avoid out-of-memory during builds:

Edit `artifacts/field-sales/android/gradle.properties`:

```properties
# Increase JVM heap for Gradle daemon
org.gradle.jvmargs=-Xmx2048m -XX:MaxMetaspaceSize=512m -Dfile.encoding=UTF-8

# Enable Gradle daemon and parallel builds
org.gradle.daemon=true
org.gradle.parallel=true
org.gradle.caching=true

# Android build settings
android.useAndroidX=true

# JDK 21 toolchain — required for @capacitor/filesystem v8.x and other plugins
# Replace the hash with the actual NixOS JDK 21 path (find it with: readlink -f $(which java))
org.gradle.java.home=/nix/store/<hash>-openjdk-21.0.7+6/lib/openjdk
org.gradle.java.installations.paths=/nix/store/<hash>-openjdk-21.0.7+6/lib/openjdk
org.gradle.java.installations.auto-detect=true
org.gradle.java.installations.auto-download=false
```

> **On NixOS/Replit:** JDK paths contain an opaque hash that changes between installs.
> Run this to auto-write the correct path:
> ```bash
> JAVA21=$(dirname $(dirname $(readlink -f $(which java))))
> echo "org.gradle.java.home=${JAVA21}" >> android/gradle.properties
> echo "org.gradle.java.installations.paths=${JAVA21}" >> android/gradle.properties
> ```

---

## 11. Add App Icons

Android requires icons in multiple resolutions. Create them from a single source image.

### Folder structure to populate:

```
android/app/src/main/res/
├── mipmap-mdpi/
│   └── ic_launcher.png         (48×48 px)
├── mipmap-hdpi/
│   └── ic_launcher.png         (72×72 px)
├── mipmap-xhdpi/
│   └── ic_launcher.png         (96×96 px)
├── mipmap-xxhdpi/
│   └── ic_launcher.png         (144×144 px)
└── mipmap-xxxhdpi/
    └── ic_launcher.png         (192×192 px)
```

### Generate from CLI using ImageMagick:

```bash
# Install ImageMagick if not available
# Replit/NixOS: nix-env -iA nixpkgs.imagemagick
# Ubuntu: sudo apt-get install -y imagemagick

# Place your source icon (1024×1024 minimum) at:
SOURCE="artifacts/field-sales/public/icons/icon-512.svg"
RES_DIR="artifacts/field-sales/android/app/src/main/res"

convert $SOURCE -resize 48x48   $RES_DIR/mipmap-mdpi/ic_launcher.png
convert $SOURCE -resize 72x72   $RES_DIR/mipmap-hdpi/ic_launcher.png
convert $SOURCE -resize 96x96   $RES_DIR/mipmap-xhdpi/ic_launcher.png
convert $SOURCE -resize 144x144 $RES_DIR/mipmap-xxhdpi/ic_launcher.png
convert $SOURCE -resize 192x192 $RES_DIR/mipmap-xxxhdpi/ic_launcher.png
```

### Adaptive Icon (Android 8.0+):

Create `android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background" />
    <foreground android:drawable="@mipmap/ic_launcher_foreground" />
</adaptive-icon>
```

Add the `ic_launcher_background` color to `android/app/src/main/res/values/colors.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="colorPrimary">#F40009</color>
    <color name="colorPrimaryDark">#B30006</color>
    <color name="colorAccent">#FF1744</color>
    <color name="ic_launcher_background">#F40009</color>
</resources>
```

> **Important:** Do NOT create a separate `ic_launcher_background.xml` file — it will conflict with
> `colors.xml` and cause a "Duplicate resources" build error. Define `ic_launcher_background` directly
> in `colors.xml` only.

---

## 12. Add Splash Screen Resources

The `capacitor.config.ts` references `androidSplashResourceName: "splash"`.
Create a simple splash drawable:

```bash
SPLASH_DIR="artifacts/field-sales/android/app/src/main/res"

# Create drawable directories
mkdir -p $SPLASH_DIR/drawable

# Create a simple white splash with the app color as background
cat > $SPLASH_DIR/drawable/splash.xml << 'EOF'
<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android">
    <solid android:color="#ffffff"/>
</shape>
EOF
```

---

## 13. Build Debug APK

```bash
cd /home/runner/workspace/artifacts/field-sales

# Sync latest web assets + plugin configs
pnpm sync:android

# Move into the Android project
cd android

# Make gradlew executable (first time only)
chmod +x gradlew

# Build the debug APK
./gradlew assembleDebug

# Output path:
# app/build/outputs/apk/debug/app-debug.apk
```

Build takes 3–8 minutes on first run (downloads Gradle + dependencies).
Subsequent builds are 30–60 seconds.

Check the output:
```bash
ls -lh app/build/outputs/apk/debug/app-debug.apk
# Expected: file size around 10–30 MB
```

---

## 14. Install Debug APK on Device via ADB

### Connect your Android device:

1. On the device: **Settings → About Phone** → tap **Build Number** 7 times to enable Developer Options
2. **Settings → Developer Options** → enable **USB Debugging**
3. Connect via USB

```bash
# Verify device is detected
adb devices
# Expected:
# List of devices attached
# XXXXXXXXXX    device

# Install the APK
adb install -r app/build/outputs/apk/debug/app-debug.apk
# -r = replace existing installation

# Launch the app directly
adb shell am start -n com.dmllabs.fieldsales/.MainActivity
```

### Watch live logs from the app:

```bash
# All Capacitor logs
adb logcat -s Capacitor

# JavaScript console.log from the WebView
adb logcat -s chromium

# All app logs (verbose)
adb logcat | grep -i "fieldsales\|capacitor\|chromium"
```

### Wireless ADB (no USB cable):

```bash
# On device: Developer Options → Wireless debugging → Pair device with code
adb pair <device-ip>:<port>   # enter pairing code when prompted
adb connect <device-ip>:<port>
adb devices
```

---

## 15. Generate Release Keystore

A keystore is the permanent signature for your app on the Play Store.
**Back this file up — if you lose it, you cannot update your Play Store listing.**

```bash
cd /home/runner/workspace

# Generate a new keystore
keytool -genkey -v \
  -keystore fieldsales-release.keystore \
  -alias fieldsales \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -storepass YOUR_STORE_PASSWORD \
  -keypass YOUR_KEY_PASSWORD \
  -dname "CN=FieldSales, OU=Mobile, O=YourCompany, L=City, S=State, C=US"

# Verify the keystore
keytool -list -v -keystore fieldsales-release.keystore -storepass YOUR_STORE_PASSWORD
```

**Store your passwords securely** — add them to Replit Secrets (not hardcoded in files).
Never commit `fieldsales-release.keystore` to git.

Add to `.gitignore`:
```bash
echo "fieldsales-release.keystore" >> .gitignore
echo "*.keystore" >> .gitignore
echo "*.jks" >> .gitignore
```

---

## 16. Configure Release Signing in Gradle

Edit `artifacts/field-sales/android/app/build.gradle`:

```groovy
android {
    ...
    signingConfigs {
        release {
            storeFile file(System.getenv("KEYSTORE_PATH") ?: "../../../fieldsales-release.keystore")
            storePassword System.getenv("KEYSTORE_PASSWORD") ?: "YOUR_STORE_PASSWORD"
            keyAlias System.getenv("KEY_ALIAS") ?: "fieldsales"
            keyPassword System.getenv("KEY_PASSWORD") ?: "YOUR_KEY_PASSWORD"
        }
    }

    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}
```

> Using environment variables keeps passwords out of source code.
> Set them in Replit Secrets: `KEYSTORE_PASSWORD`, `KEY_PASSWORD`, `KEY_ALIAS`, `KEYSTORE_PATH`.

---

## 17. Build Release APK and AAB

```bash
cd /home/runner/workspace/artifacts/field-sales/android

# ── Release APK (for direct install / testing) ──────────────
./gradlew assembleRelease
# Output: app/build/outputs/apk/release/app-release.apk

# ── Release AAB (for Google Play Store upload) ───────────────
./gradlew bundleRelease
# Output: app/build/outputs/bundle/release/app-release.aab
```

Verify the release APK is properly signed:

```bash
apksigner verify --verbose app/build/outputs/apk/release/app-release.apk
# Expected: Verified using v2 scheme (APK Signature Scheme v2): true
```

Or with keytool:
```bash
keytool -printcert -jarfile app/build/outputs/apk/release/app-release.apk
```

---

## 18. Re-sync After Code Changes

Any time you change JavaScript/TypeScript code or Capacitor config, run this:

```bash
cd /home/runner/workspace/artifacts/field-sales

# Rebuild web assets and sync into android/
pnpm sync:android

# Then rebuild from the android/ directory
cd android && ./gradlew assembleDebug   # or assembleRelease
```

Quick reference for the most common workflow:

```bash
# Full rebuild cycle (from workspace root)
cd /home/runner/workspace/artifacts/field-sales && \
  pnpm sync:android && \
  cd android && \
  ./gradlew assembleDebug && \
  adb install -r app/build/outputs/apk/debug/app-debug.apk && \
  echo "✅ Installed on device"
```

---

## 19. Plugin-Specific Notes

### `@capacitor-mlkit/barcode-scanning`
- Requires **Google Play Services** on the device
- Will not work on stock Android emulators without Google APIs
- Minimum Android API: 23
- If testing on emulator, use an **AVD with Google APIs** image

### `capacitor-native-biometric`
- Requires a device with fingerprint sensor or face unlock hardware
- Minimum Android API: 23
- Test on a real device — emulator biometric simulation requires additional AVD config

### `@capacitor/local-notifications`
- On Android 13+ (API 33), the system shows a runtime permission dialog for notifications
- The app requests this automatically via the plugin
- Add the exact alarm permission in manifest for precise scheduling:
  `android.permission.SCHEDULE_EXACT_ALARM`

### `@capacitor/screen-orientation`
- Configured both in `AndroidManifest.xml` (`android:screenOrientation="portrait"`) AND called
  via plugin in `App.tsx` — both are needed for full reliability

### `capacitor-secure-storage-plugin`
- Uses Android `EncryptedSharedPreferences` (requires API 23+)
- Data survives app updates but is wiped on uninstall by default

### `@capawesome/capacitor-badge`
- Android badge count requires a supported launcher (Samsung, Nova, etc.)
- Stock Google Pixel launcher does not show badge numbers (only dots)

---

## 20. Troubleshooting

### `SDK location not found`
```bash
# Create local.properties manually
echo "sdk.dir=$HOME/android-sdk" > android/local.properties
```

### `Could not find sdkmanager`
```bash
# Check the folder structure is correct
ls ~/android-sdk/cmdline-tools/latest/bin/sdkmanager
# If missing, re-extract the tools into the correct path (see Step 3)
```

### `Java version mismatch` / `Unsupported class file major version`
```bash
# Ensure JAVA_HOME points to JDK 21
java -version
export JAVA_HOME=$(dirname $(dirname $(readlink -f $(which java))))
```

### `Cannot find a Java installation matching languageVersion=21`
This happens when `@capacitor/filesystem` or other plugins require JDK 21 but JDK 17 is installed.

```bash
# Install JDK 21 (Replit/NixOS)
# Edit replit.nix to use pkgs.jdk21 then let Replit reload

# After installing, add the JDK path to gradle.properties
JAVA21=$(dirname $(dirname $(readlink -f $(which java))))
echo "org.gradle.java.home=${JAVA21}" >> android/gradle.properties
echo "org.gradle.java.installations.paths=${JAVA21}" >> android/gradle.properties
echo "org.gradle.java.installations.auto-detect=true" >> android/gradle.properties
echo "org.gradle.java.installations.auto-download=false" >> android/gradle.properties

# Clean and rebuild
./gradlew clean assembleDebug
```

### `Duplicate resources` — `splash.png` and `splash.xml` conflict
Capacitor generates `drawable/splash.xml`; if `drawable/splash.png` also exists, the merger fails.
```bash
# Remove the PNG — keep only the XML version
rm android/app/src/main/res/drawable/splash.png
```

### `Duplicate resources` — `ic_launcher_background` defined twice
This happens if both `values/colors.xml` and `values/ic_launcher_background.xml` exist.
```bash
# Remove the separate file — define the color only in colors.xml
rm android/app/src/main/res/values/ic_launcher_background.xml
```

### `Gradle build fails: AAPT2 error`
```bash
# Clean and rebuild
./gradlew clean assembleDebug
```

### `adb: device not found`
```bash
adb kill-server
adb start-server
adb devices
# Check USB debugging is enabled on device
# Try a different USB cable / port
```

### `INSTALL_FAILED_UPDATE_INCOMPATIBLE`
```bash
# Uninstall the existing app first (different signature)
adb uninstall com.dmllabs.fieldsales
adb install app/build/outputs/apk/debug/app-debug.apk
```

### `App crashes immediately on launch`
```bash
# View crash logs
adb logcat -s AndroidRuntime:E
# Look for "FATAL EXCEPTION" lines
```

### `Camera / Location permission denied silently`
- Ensure permissions are in `AndroidManifest.xml` (Step 8)
- On Android 6+, permissions also need to be requested at runtime — the Capacitor plugins handle this automatically
- Check **Settings → Apps → FieldSales → Permissions** on device

### `Barcode scanner not working`
- Device needs Google Play Services
- Use an AVD with "Google APIs" image, not "Android Open Source Project" image
- Check: `adb shell pm list packages | grep google.android.gms`

---

## Quick Reference — All Commands

```bash
# ── One-time setup ───────────────────────────────
npx cap add android           # generate android/ project (once)

# ── Every build cycle ────────────────────────────
pnpm sync:android             # build web + sync to android/
cd android
./gradlew assembleDebug       # build debug APK
adb install -r app/build/outputs/apk/debug/app-debug.apk

# ── Release build ────────────────────────────────
./gradlew assembleRelease     # signed APK
./gradlew bundleRelease       # AAB for Play Store

# ── Logs ─────────────────────────────────────────
adb logcat -s Capacitor       # native plugin logs
adb logcat -s chromium        # JS console logs

# ── Clean build ──────────────────────────────────
./gradlew clean assembleDebug
```

---

## Credits

| Role | Details |
|---|---|
| **Developed by** | [DML Labs](https://github.com/Devmayank-official) |
| **Lead Engineer** | [@Devmayank-official](https://github.com/Devmayank-official) |
