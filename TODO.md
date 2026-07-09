# Flutter Audio Enhancer Conversion TODO

## Step 1: Check Flutter/Android configs [PENDING]
- Run `flutter doctor -v`
- Fix any issues (accept licenses, install Android SDK/NDK/Java if missing)
- Confirm NDK/SDK/Java versions compatible (NDK 25+, Java 17+, SDK 34+)

## Step 2: Create Flutter project [DONE]
- `flutter create audio_enhancer_flutter`
- `cd audio_enhancer_flutter`

## Step 3: Add dependencies & setup [DONE]
- Created pubspec.yaml with deps
- Run `cd audio_enhancer_flutter ; flutter pub get` next

## Step 4: Implement UI & Logic [PENDING]
- lib/main.dart: Scaffold with controls
- lib/services/audio_handler.dart: API call, record, play, visualize
- Update android/app/build.gradle for minSdk 21+

## Step 5: Test [PENDING]
- Connect device/emulator
- `flutter run`

## Step 6: Build APK [PENDING]
- `flutter build apk --release`
- Output: build/app/outputs/flutter-apk/app-release.apk

Updated: PowerShell commands will use ; chaining e.g. flutter create proj ; cd proj


