# Fix Plan — Contacts Permission Error

## Error
```
Could not access contacts
Missing the following permissions in AndroidManifest.xml: android.permission.WRITE_CONTACTS
```
Screenshot: attached_assets/Screenshot_2026-04-06-19-48-51-96_...jpg

## Root Cause
`AndroidManifest.xml` only declares `READ_CONTACTS`.
The `@capacitor-community/contacts` plugin requires **both** permissions to initialise its
content-resolver bridge on Android — even when the app only reads contacts.

## Fix
Add `WRITE_CONTACTS` to the contacts block in
`artifacts/field-sales/android/app/src/main/AndroidManifest.xml`.

```xml
<!-- ── CONTACTS (@capacitor-community/contacts) ──────────────────────── -->
<uses-permission android:name="android.permission.READ_CONTACTS" />
<uses-permission android:name="android.permission.WRITE_CONTACTS" />
```

## Rebuild Steps
1. Fix `AndroidManifest.xml` — add `WRITE_CONTACTS`
2. `pnpm sync:android` — Vite native build + `npx cap sync android`
3. `cd android && ./gradlew assembleDebug`
4. Send `app-debug.apk` to Telegram

## Status
- [x] Plan created
- [x] Manifest fixed — WRITE_CONTACTS added to AndroidManifest.xml (line 41)
- [x] Rebuilt — Gradle assembleDebug BUILD SUCCESSFUL (2m 21s, 727 tasks)
- [x] APK sent to Telegram — message_id 83, file_size 45,453,456 bytes
