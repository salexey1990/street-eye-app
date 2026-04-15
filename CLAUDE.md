# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npx expo start          # Start dev server
npx expo start --ios    # Run on iOS simulator
npx expo start --android # Run on Android emulator
npm run lint            # ESLint via expo lint
```

No test runner is configured (Jest + RNTL are planned but not set up).

## Environment Variables

```
EXPO_PUBLIC_API_URL      # Backend base URL (defaults to http://localhost:3000)
EXPO_PUBLIC_API_TIMEOUT  # Axios timeout in ms (defaults to 10000)
```

## Stack

- **React Native 0.81.5** + **Expo ~54** + **TypeScript ~5.9** (strict)
- **Expo Router ~6** for file-based navigation (typed routes enabled)
- **React 19** with React Compiler enabled
- **Reanimated ~4.1** for animations
- **Zustand** for state management
- **Axios** for API calls (with auto-refresh interceptor)
- **i18next** (Russian + English, key: `useTranslation()` hook)
- Path alias: `@/*` → `./` (e.g. `@/constants/theme`)

## Architecture

### Navigation (Expo Router)

```
app/
  _layout.tsx           # Root: DarkTheme + Stack, routing decided by onboarding_complete in AsyncStorage
  index.tsx             # Redirects based on session state
  (auth)/
    login.tsx
    register.tsx
  (onboarding)/
    _layout.tsx
    index.tsx           # Entry point, redirects to welcome
    welcome.tsx → language.tsx → level.tsx → preferences.tsx → notifications.tsx → first-task.tsx
  (tabs)/
    _layout.tsx         # Bottom tabs: Task / Journal / Profile
    index.tsx           # Task screen (main screen)
    journal.tsx
    profile.tsx
  journal/[id].tsx      # Journal entry detail
  paywall.tsx           # Modal, gated by MONETIZATION_ENABLED flag
```

**Root routing logic** (`app/_layout.tsx`): on cold start reads `onboarding_complete` from AsyncStorage — if absent, routes to `(onboarding)`; otherwise calls `restoreSession()` and routes to `(tabs)`.

### State Management (`store/`)

All stores use Zustand. Key stores:

| Store | Purpose |
|---|---|
| `auth.store.ts` | Login/register/logout, session restore, `accessToken` / `userId` |
| `task.store.ts` | Active task, preview task, guest task, swap counter, session CRUD |
| `subscription.store.ts` | Premium flag, monthly task counter, `MONETIZATION_ENABLED` kill-switch |
| `journal.store.ts` | Journal entries list and CRUD |
| `profile.store.ts` | User profile data |
| `settings.store.ts` | App settings |

**Token sync**: `auth.store.ts` subscribes to itself and updates `api.defaults.headers.common.Authorization` whenever `accessToken` changes. Never set the Authorization header manually elsewhere.

### API Client (`lib/api/client.ts`)

Single Axios instance (`api`) with:
- Auto token refresh on 401 (retries the original request after refreshing)
- `authApi` legacy export (kept for backward compat — prefer `useAuthStore` actions)

All API modules (`lib/api/tasks.ts`, `lib/api/journal.ts`, `lib/api/sessions.ts`, `lib/api/profile.ts`) use this shared `api` instance.

### Secure Storage

- `SecureStore` (`expo-secure-store`): `refresh_token`, `user_id`
- `AsyncStorage`: `locale`, `onboarding_complete`, `onboarding_data`, `guest_active_task`, monthly task counts keyed as `tasks_{userId}_{YYYY-MM}`

### Monetization (`store/subscription.store.ts`)

`MONETIZATION_ENABLED = false` is a kill-switch at the top of the file. When `false`, `isAtMonthlyLimit()` always returns `false` and `swapsPerSession()` always returns the premium value (3). All monetization-gated code is annotated with `// [MONETIZATION]` comments. The paywall screen (`app/paywall.tsx`) and IAP logic (`lib/iap.ts`) exist but are unreachable while the flag is off.

IAP is stubbed — `purchasePremium()` and `restorePurchases()` throw `IAP_NOT_CONFIGURED`. Needs `react-native-iap` or RevenueCat before launch.

### Task Screen States (`app/(tabs)/index.tsx`)

The main screen has three mutually exclusive states:
- **State A** — active task (accepted, in-progress). Shows task card + timer + "Done" / "Save for later".
- **State B** — no active task / preview mode. Shows "Get task" → preview card → "Take" / "Another task".
- **State C** — monthly limit reached (only when `MONETIZATION_ENABLED=true`). Shows paywall CTA.

Guest users can preview tasks but are shown `RegisterSheet` when they try to accept/complete.

### Design System (`constants/theme.ts`)

All screens must use tokens from `theme.ts`:

| Token | Value | Use |
|---|---|---|
| `colors.bg` | `#1C1C1E` | Main background |
| `colors.bgSurface` | `#2C2C2E` | Cards / inputs |
| `colors.bgElevated` | `#3A3A3C` | Modals / overlays |
| `colors.accent` | `#9B51E0` | Primary CTA (purple) |
| `colors.accentPressed` | `#7B3DB8` | Button pressed state |
| `colors.text` | `#FFFFFF` | Primary text |
| `colors.textSecondary` | `rgba(235,235,245,0.6)` | Secondary text |
| `colors.textMuted` | `rgba(235,235,245,0.3)` | Muted text |
| `colors.textDisabled` | `rgba(235,235,245,0.18)` | Disabled state |
| `colors.separator` | `rgba(235,235,245,0.15)` | Dividers |
| `colors.iconMuted` | `rgba(235,235,245,0.4)` | Muted icons |
| `radius.pill` | `100` | Button border radius |

Spacing: `xs`(4) `sm`(8) `md`(16) `lg`(24) `xl`(32) `xxl`(48)

Typography presets: `displayLg`, `displaySm`, `label`, `body`, `bodySmall`, `link`, `button`

**Always spread `theme.font.family`** alongside typography presets (e.g. `{ ...theme.font.body, fontFamily: theme.font.family }`).

### Screen Patterns

- `SafeAreaView` + `KeyboardAvoidingView` for scrollable auth/form screens
- `Ionicons` from `@expo/vector-icons` for all icons
- Inputs disabled during loading (`loading` state flag)
- Error display: red `#FF6B6B`, via `store.error` error code strings
- All user-visible strings via `t('key')` from `useTranslation()`; Russian is primary locale

### i18n (`lib/i18n/`)

Locale auto-detected from device, overridden by `locale` in AsyncStorage. Translation files at `lib/i18n/locales/ru.json` and `en.json`. Language is persisted on the `onboarding/language` screen.

## Specifications

Full product and technical specs live in `spec/`:
- `spec/StreetEye_MVP_Specification_v1_5.md` — product scope, flows, non-goals
- `spec/StreetEye_Mobile_TZ_v1_9.md` — technical requirements, directory structure, data models
- `spec/StreetEye_Backend_TZ_v1_6.md` — backend API contracts

Consult these before implementing new modules.
