# EAS Configuration Documentation

This document explains the EAS build and submit configuration for the Rocket Meals Android app.

## Problem Solved

The previous configuration was creating APKs for production builds, which caused Google Play Store upload failures with the error:
```
Google Api Error: Invalid request - APKs are not allowed for this application.
```

## Solution

Updated `apps/frontend/app/eas.json` to properly separate APK builds (for internal testing) from AAB builds (for Play Store).

## Build Profiles

### `previewApk` Profile
- **Purpose**: Internal testing outside of Google Play Store
- **Output**: APK file
- **Usage**: GitHub workflow `frontend_native_android_preview.yml`
- **Configuration**:
  ```json
  "previewApk": {
    "android": {
      "buildType": "apk"
    },
    "channel": "production",
    "node": "22.16.0"
  }
  ```

### `production` Profile  
- **Purpose**: Google Play Store submission
- **Output**: AAB (Android App Bundle)
- **Usage**: GitHub workflow `frontend_native_android.yml`
- **Configuration**:
  ```json
  "production": {
    "android": {
      "buildType": "aab"
    },
    "autoIncrement": false,
    "channel": "production",
    "node": "22.16.0"
  }
  ```

## Submit Configuration

### `production` Submit Profile
- **Purpose**: Automatic upload to Google Play Store internal track
- **Configuration**:
  ```json
  "submit": {
    "production": {
      "android": {
        "track": "internal",
        "releaseStatus": "draft"
      },
      "ios": {
        "appleId": "nils@baumgartner-software.de",
        "ascAppId": "6483930801",
        "appleTeamId": "6U99CRVHVR"
      }
    }
  }
  ```

## GitHub Workflows

### Production Build & Submit (`frontend_native_android.yml`)
```bash
# Build AAB for Play Store
eas build --platform android --non-interactive --profile production

# Submit to Play Store internal track
eas submit --platform android --non-interactive --latest --profile production
```

### Preview APK Build (`frontend_native_android_preview.yml`)
```bash
# Build APK for internal testing (no submission)
eas build --platform android --non-interactive --profile previewApk
```

## Key Benefits

1. **Clear Separation**: APK builds for internal testing vs AAB builds for Play Store
2. **No Profile Fallback**: Explicit profile specification prevents accidental wrong build types
3. **Automatic Play Store Upload**: Production builds automatically upload to internal track
4. **Documented Configuration**: Clear comments and documentation for maintenance

## Customer Configurations

The app supports multiple customer configurations (devConfig, swosyConfig, studiFutterConfig) defined in `apps/frontend/app/config.ts`. Each customer can have different:
- Bundle IDs (iOS and Android)
- Project names and slugs
- EAS Project IDs
- Server URLs

The EAS configuration works with all customer configs as the specific app details are pulled from the dynamic configuration.