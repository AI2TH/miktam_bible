# Miktam Bible - Developer Skills & Command Guide

## Environment Prerequisites (Windows Developer Environment)
This project relies on local builds with a preseeded SQLite database and a local GGUF llama model. The local native Android build environment requires the following settings:

- **JAVA_HOME**: Must point to Android Studio's bundled JBR runtime:
  ```powershell
  $env:JAVA_HOME='C:\Program Files\Android\Android Studio\jbr'
  ```
- **Android SDK Path**: `C:\Users\kevin\AppData\Local\Android\Sdk`
- **local.properties**: Ensure [android/local.properties](file:///C:/Users/kevin/OneDrive/Documents/kalvin/bible/android/local.properties) exists with the correct SDK directory:
  ```properties
  sdk.dir=C\:\\Users\\kevin\\AppData\\Local\\Android\\Sdk
  ```

---

## Build Commands

### Android App Bundle (AAB) Release Build
To compile and generate the signed release AAB for Google Play Store upload:
```powershell
cd android
$env:JAVA_HOME='C:\Program Files\Android\Android Studio\jbr'
.\gradlew.bat bundleRelease
```
*Output Location*: [android/app/build/outputs/bundle/release/app-release.aab](file:///C:/Users/kevin/OneDrive/Documents/kalvin/bible/android/app/build/outputs/bundle/release/app-release.aab)

### Android Package (APK) Release Build
To compile and generate the release APK:
```powershell
cd android
$env:JAVA_HOME='C:\Program Files\Android\Android Studio\jbr'
.\gradlew.bat assembleRelease
```
*Output Location*: [android/app/build/outputs/apk/release/app-release.apk](file:///C:/Users/kevin/OneDrive/Documents/kalvin/bible/android/app/build/outputs/apk/release/)

### Clean Build
To clean compilation cache and intermediate files:
```powershell
cd android
.\gradlew.bat clean
```

---

## Run and Development Commands

### Start Metro Bundler
```bash
npm run start
# or: npx expo start
```

### Start Emulator
Start the designated `Pixel_8a` AVD (bypassing snapshots to avoid stale state):
```powershell
C:\Users\kevin\AppData\Local\Android\Sdk\emulator\emulator.exe -avd Pixel_8a -no-snapshot-load
```

---

## Codebase Structure & Preseeded Assets
This application embeds offline assets that are copied to application storage during first run:
- **Preseeded SQLite DB**: [android/app/src/main/assets/bible.db](file:///C:/Users/kevin/OneDrive/Documents/kalvin/bible/android/app/src/main/assets/bible.db) (~648 MB)
- **Preseeded LLM Model**: [android/app/src/main/assets/bible-q4km.gguf](file:///C:/Users/kevin/OneDrive/Documents/kalvin/bible/android/app/src/main/assets/bible-q4km.gguf) (~105 MB)

*Note*: Since the preseeded database and LLM files are large, native build tasks can take substantial memory. The heap size is currently configured to `2 GiB` with a `512 MiB` metaspace in `gradle.properties`.
