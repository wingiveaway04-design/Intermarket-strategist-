# Intermarket Strategist Mobile

The Android and iOS apps use the live **AIS — Abdulkadir Intermarket Strategies** website as their single source of truth. The native application opens the complete website in a native WebView instead of maintaining a reduced, separate set of mobile screens.

## Website parity

- The app opens the live AIS website at https://intermarket-strategist.vercel.app.
- Website navigation, pages, responsive layouts, authentication, account permissions, premium access and server-side data remain owned by the website.
- All website modules are available through the same routes and account session as the website, including Dashboard, Research, Macro Radar, News Trading, COT Reports, Barometer, Trade Setups, Trading Journal, Lounge, Messages, Sessions, Notifications, Profile, Settings and Admin pages where the signed-in account is authorized.
- Website changes become available in the app without rebuilding the native shell.
- Native app branding, Android back navigation, pull-to-refresh, link handling, loading/error recovery and app icon remain native.

## Toolchain

- Expo SDK 58 / React Native 0.88
- `react-native-webview` 14.0.1
- Node.js 22.13+ (or a supported newer even-numbered LTS release)

Install dependencies from this directory with `npm install`, then run `npm run typecheck` and `npx expo-doctor`.

## Local setup

1. Install Node.js 22.13+.
2. From this directory, run `npm install`.
3. Run `npx expo start` for local development.
4. Create an Android APK with the EAS `preview` profile for direct device installation, or an Android App Bundle with the `production` profile for Play Store submission.

The app uses the deployed website origin and the website's existing Supabase SSR authentication cookies. Do not put a Supabase service-role key in the native application.

## Native behavior

- Android hardware Back navigates backward through website history before allowing the operating system to leave the app.
- Pull-to-refresh reloads the current website page.
- External telephone, SMS, email, WhatsApp and Android intent links are handed to the operating system.
- Web pages, payment flows and authentication callbacks remain inside the WebView unless they explicitly invoke an external app scheme.
- The native launch screen displays the AIS brand while the website loads.
- The native app icon is configured at `assets/icon.png`.

## Security and release notes

- Authentication and authorization are handled by the existing AIS website and Supabase server-side session.
- Premium and admin content continue to be protected by website authorization and Supabase Row Level Security.
- The app contains no service-role credentials.
- A successful Android APK build confirms compilation and packaging, not end-to-end testing on every device or payment/authentication provider.
