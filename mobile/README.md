# AIS mobile application

**AIS — Abdulkadir Intermarket Strategies** · *See the bigger picture.*

The native app is a clean, branded shell around the complete live AIS website at https://intermarket-strategist.vercel.app. The website remains the single source of truth for pages, accounts, permissions, research, market data, and member features. This app must not become a reduced replacement for the website.

All website modules remain available subject to account permissions: Dashboard, Research, Macro Radar, News Trading, COT Reports, Barometer, Trade Setups, Trading Journal, Lounge, Messages, Sessions, Notifications, Profile, Settings, and Admin pages.

Native behavior includes the AIS launch/loading screen and icon, Android Back navigation, pull-to-refresh, external email/telephone/SMS/WhatsApp links, loading/error recovery, and shared website cookies.

## Build

```sh
npm install
npm run typecheck
npx expo-doctor
npx expo start
```

EAS `preview` is for internal QA only. EAS `production` generates the Android App Bundle for the final Google Play release. Authentication and authorization stay on the AIS website/Supabase; no service-role key is shipped in the app.
