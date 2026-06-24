# Build iOS

## Prerequisites

- Mac with Xcode 15+
- iOS 13+ deployment target
- Apple Developer account (for device testing and App Store)
- CocoaPods installed: `sudo gem install cocoapods`
- Node.js 18+

## Setup

```bash
# 1. Clone and install
git clone https://github.com/alhazayed/assessment-project.git
cd assessment-project
npm install

# 2. Sync Capacitor
npx cap sync ios

# 3. Open in Xcode
npx cap open ios
```

In Xcode:
1. Select the `App` target
2. Set **Bundle Identifier** to `com.vwelfare.app`
3. Set **Team** to your Apple Developer team
4. Set **Marketing Version** to `1.0.0`
5. Set **Build** to `1`

## Build for Simulator

In Xcode: Select simulator → ▶ Run

## Build for Device (TestFlight)

1. Connect device and trust it in Xcode
2. Select your device from the scheme picker
3. **Product → Archive**
4. In Organizer: **Distribute App → App Store Connect → Upload**

## App Store Connect Setup

1. Create app at https://appstoreconnect.apple.com
2. Bundle ID: `com.vwelfare.app`
3. App Name: `V Welfare`
4. Category: **Medical** or **Health & Fitness**
5. Age Rating: **17+** (medical / mental health)

## Universal Links (Deep Linking)

Host at `https://vwelfare.vercel.app/.well-known/apple-app-site-association`:
```json
{
  "applinks": {
    "apps": [],
    "details": [{
      "appID": "TEAM_ID.com.vwelfare.app",
      "paths": ["/reset-password", "/login", "/*"]
    }]
  }
}
```

Replace `TEAM_ID` with your Apple Developer Team ID.

## Required Entitlements

In `ios/App/App/App.entitlements` (create if missing):
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "...">
<plist version="1.0">
<dict>
    <key>com.apple.developer.associated-domains</key>
    <array>
        <string>applinks:vwelfare.vercel.app</string>
    </array>
    <key>keychain-access-groups</key>
    <array>
        <string>$(AppIdentifierPrefix)com.vwelfare.app</string>
    </array>
</dict>
</plist>
```

## Privacy Manifest

`PrivacyInfo.xcprivacy` is already configured in `ios/App/App/`.  
Add it to the Xcode project target by dragging it into the App group in Xcode Navigator.

## TestFlight

1. Archive and upload to App Store Connect
2. In App Store Connect → TestFlight tab → add internal testers
3. After Apple review (~24h): distribute to external testers

## Minimum iOS Version

iOS 13.0 — set in `ios/App/Podfile`:
```ruby
platform :ios, '13.0'
```
