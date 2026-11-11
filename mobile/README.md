# Intermarket Strategist Mobile

Native Android and iOS application built with Expo / React Native. This app is a separate client for the existing Intermarket Strategist Supabase project; it does not replace or modify the production website.

## Current foundation

- Cross-platform Android and iOS project structure.
- Shared Supabase authentication and data backend.
- Mobile-first AIS Terminal shell.
- Notification inbox and push notification integration are planned as first-class features.
- App distribution remains private during development; Play Store and App Store publication are deferred.

## Toolchain

The project targets the current Expo SDK 58 / React Native 0.88 generation. See the official [Expo project setup guide](https://docs.expo.dev/get-started/create-a-project/) and [Supabase Expo guide](https://supabase.com/docs/guides/getting-started/quickstarts/expo-react-native).

## Local setup

1. Install Node.js LTS.
2. From this directory, install dependencies with `npm install`.
3. Copy `.env.example` to `.env` and set the existing Supabase project URL and publishable/anon key. Never put a service-role key in a mobile app.
4. Run `npx expo start`.

## Security and release notes

- Reuse the existing Supabase Auth user accounts.
- All user data access must remain protected by the existing Row Level Security policies.
- Device push tokens must be stored per authenticated user and device, with users able to revoke notification permissions.
- Push delivery will be sent by a trusted server-side Edge Function, never directly from the app with privileged credentials.
- Push permissions are requested contextually and only after the user understands the benefit.
- Android test builds can be distributed as APKs. iOS test distribution uses Apple's signed development/TestFlight workflow.
- Do not publish to either app store until both platforms pass real-device testing and the user approves release.

## Planned workspaces

Home, Research, Trade Ideas, Private Trading Journal, Community, Private Messages, Notifications, Video Sessions, and Account / Preferences.
