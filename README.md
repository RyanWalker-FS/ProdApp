# ConnectedTech — Productivity App (Expo + TypeScript)

This repository contains a cross-platform (iOS/Android/Web) productivity app built with Expo, Expo Router, React Native (Web), and TypeScript. It implements a simple Tasks CRUD, persistent storage (SQLite on native, `localStorage` on web), SecureStore-based settings, and styling via NativeWind/Tailwind.

Quick start

Prerequisites

- Node.js (16+ recommended)
- `npm` (or `yarn`) available in your PATH
- Expo CLI (optional): `npm install -g expo-cli` (you can use `npx expo` instead)

Install dependencies

```bash
cd ConnectedTech
npm install
# or
# yarn install
```

Run the app (development)

- Start Expo (metro) and open the web app:

```bash
npx expo start --web --clear
```

- To open on a simulator or device, use the Expo DevTools or run:

```bash
npx expo start
# then press i (iOS simulator) or a (Android emulator), or scan the QR code with Expo Go
```

Important commands

- Start web (clear cache): `npx expo start --web --clear`
- Start dev server (all platforms): `npx expo start`
- Install new package: `npm install <pkg>`

Project structure (key files)

- `app/_layout.tsx` — Root layout and theme provider wiring (reads `app_theme` from secure storage).
- `app/(tabs)/index.tsx` — Tasks list screen (main UI for tasks).
- `app/app-task.tsx`, `app/edit-task.tsx` — Add / edit task screens.
- `app/settings.tsx` — Settings screen (user name, theme preference saved via SecureStore wrapper).
- `components/TaskProvider.tsx` — Tasks context/provider and hooks (`useTasks`).
- `components/ExternalLink.tsx` — External link helper (uses `Link asChild` to avoid passing RN styles to DOM anchors).
- `components/Themed.tsx` — Small helpers to apply theme-aware colors to `Text` and `View`.
- `services/storage.native.ts` — Native storage (runtime-loads `expo-sqlite` with in-memory fallback).
- `services/storage.web.ts` — Web storage (localStorage wrapper).
- `services/secureStorage.ts` — SecureStore wrapper (with web fallback).
- `styles/global.css`, `tailwind.config.js`, `postcss.config.js` — Tailwind & PostCSS config and global CSS.

Common development notes & known issues

1. Web runtime error: "Failed to set an indexed property [0] on 'CSSStyleDeclaration'"

- Cause: A React Native style (often an array or nested object) is being applied to a DOM `a` element (anchor). React DOM attempts to set style indices on `element.style` which isn't supported.
- Typical culprit: `expo-router`'s `Link` when used with `style` props or when RN-style arrays are passed directly to the `Link` component. When `Link` renders a DOM `<a>`, passing a React Native style array results in the error.
- Fixes:

  - Use `Link` with `asChild` and wrap a RN component (e.g. `TouchableOpacity` / `Pressable`) so RN styles apply to RN element, not the DOM anchor. Example:
    ```tsx
    <Link href="/settings" asChild>
      <TouchableOpacity
        style={StyleSheet.flatten([styles.btn, { backgroundColor }])}
      >
        <Text>Settings</Text>
      </TouchableOpacity>
    </Link>
    ```
  - Avoid passing arrays of styles directly into a component that may render to DOM. Use `StyleSheet.flatten(...)` to produce a plain object for web-safe values.
  - Search for `Link` usages across the codebase and confirm `asChild` is used where the link receives RN styles.
  - Useful search commands:

    ```bash
    # Find all Link imports/usages
    rg "\bLink\b" -n

    # Find places using array-style RN `style` props
    rg "style=\s*\[" -n
    ```

2. Tailwind / PostCSS

- The repo includes `tailwind.config.js` and `styles/global.css` with `@tailwind` directives. Ensure `postcss.config.js` is present and `postcss` + `tailwindcss` + `autoprefixer` are installed.
- If you modify Tailwind config, restart the dev server.

3. Storage behavior

- On native platforms the app attempts to open a SQLite DB using `expo-sqlite` at runtime; on web it falls back to `localStorage`. If `expo-sqlite` is not available in the environment, the code provides an in-memory fallback.

Troubleshooting checklist

- If the web overlay shows the CSSStyleDeclaration error:
  1. Copy the React overlay component stack (the small error box in the browser) — it contains the component path that produced the `<a>` element.
  2. Search the codebase for that component and check any `Link` usages or props being passed through.
  3. Ensure `Link` that wraps RN components uses `asChild` and styles are applied to the child, not to `Link` directly.
  4. Flatten any style arrays with `StyleSheet.flatten([...])` before passing them to a child when targeting web.

Developer tips

- Use the `utils/handleNavigation.ts` helper if you prefer to navigate with `TouchableOpacity` and don't want to use `Link` for every route.
- When editing theme or SecureStore logic, check `app/_layout.tsx` and `services/secureStorage.ts`.

Contributing

- Keep changes minimal and platform-aware. If you add a native dependency, prefer runtime import patterns for web compatibility (see `services/storage.native.ts`).
- Run the dev server and test on web and a native device/emulator.

If anything in this README is out-of-sync with the repo, open an issue or contact the maintainer. Happy hacking!
