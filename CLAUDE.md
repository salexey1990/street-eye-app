# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npx expo start          # Start dev server
npx expo start --ios    # Run on iOS simulator
npx expo start --android # Run on Android emulator
npm run lint            # ESLint via expo lint
```

No test runner is configured yet (Jest + RNTL are planned but not set up).

## Stack

- **React Native 0.81.5** + **Expo ~54** + **TypeScript ~5.9** (strict)
- **Expo Router ~6** for file-based navigation (typed routes enabled)
- **React 19** with React Compiler enabled
- **Reanimated ~4.1** for animations
- Path alias: `@/*` → `./` (e.g. `@/constants/theme`)

## Architecture

### Navigation (Expo Router)

```
app/
  _layout.tsx         # Root: forces DarkTheme + Stack, initialRouteName=(auth)/login
  index.tsx           # Redirects to /(auth)/register
  (auth)/
    login.tsx         # Implemented
    register.tsx      # Implemented
  (tabs)/             # NOT YET IMPLEMENTED — main app shell
  (onboarding)/       # NOT YET IMPLEMENTED — 6-screen onboarding flow
```

### Design System (`constants/theme.ts`)

All screens must use tokens from `theme.ts`. Key values:

| Token | Value | Use |
|---|---|---|
| `colors.bg` | #1C1C1E | Main background |
| `colors.bgSurface` | #2C2C2E | Cards / inputs |
| `colors.bgElevated` | #3A3A3C | Modals / overlays |
| `colors.accent` | #9B51E0 | Primary CTA (purple) |
| `colors.accentPressed` | #7B3DB8 | Button pressed state |
| `colors.text` | #FFFFFF | Primary text |
| `colors.textSecondary` | rgba(235,235,245,0.6) | Secondary text |
| `radius.pill` | 100 | Button border radius |

Spacing scale: `xs`(4) `sm`(8) `md`(16) `lg`(24) `xl`(32) `xxl`(48)

Typography presets: `displayLg`, `displaySm`, `label`, `body`, `bodySmall`, `link`, `button`

### Auth Screens Pattern

Both `login.tsx` and `register.tsx` are the reference implementations. Key patterns to follow:
- `SafeAreaView` + `KeyboardAvoidingView` wrapping
- `Ionicons` for icons (`@expo/vector-icons`)
- Inputs disabled during loading (`loading` state flag)
- Error codes: `INVALID_CREDENTIALS`, `EMAIL_NOT_VERIFIED`, `RATE_LIMIT_EXCEEDED` → mapped to user-facing Russian strings
- Error displayed in red (`#FF6B6B`)
- API calls are currently stubbed with `TODO` comments

### Planned but Not Yet Implemented

The following directories/modules are specified in `spec/` but don't exist yet:
- `store/` — Zustand state management
- `lib/api/` — Axios API client
- `lib/db/` — Expo SQLite
- `lib/i18n/` — i18next (Russian + English)
- `components/` — shared UI components
- `/(tabs)` — bottom tab navigation with main app screens
- `/(onboarding)` — 6-screen onboarding (welcome → language → level → preferences → notifications → first task)

MVP task database: 30 tasks across 4 categories (Visual, Technical, Social, Limitations) × 3 levels (Beginner/Intermediate/Expert).

## Specifications

Full product and technical specs live in `spec/`:
- `spec/StreetEye_MVP_Specification.md` — product scope, flows, non-goals
- `spec/StreetEye_Mobile_TZ.md` — technical requirements, directory structure, data models

Consult these before implementing new modules.
