# JKPay iOS App (SwiftUI)

This folder contains SwiftUI source files intended to be dropped into a new Xcode iOS app project.

## Setup

1. Create a new iOS App in Xcode (SwiftUI lifecycle).
2. Copy the contents of this folder into the Xcode project.
3. Update the API base URL in AppConfig.swift.
4. Run the Next.js backend and sign in from the app.

## Auth flow

The app uses NextAuth session cookies. Sign in happens in the system browser:

- Tap "Sign in with Microsoft" to open the web login.
- After completing login, return to the app and tap "Refresh session".

## Notes

- Ensure the Next.js DOMAIN env var matches the base URL configured in the app.
- The Manage screen is read-only in this MVP. Use the web app for full editing.
- If you use http://localhost for dev, add an ATS exception in Info.plist.
