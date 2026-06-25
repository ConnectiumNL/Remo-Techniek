# Version History

## [PWA 0.1.0] — 2026-06-25 — First stable PWA release

### Changes
- Remove webapps section (BouwZo, FGO+, VPortaal)
- Add QR code scanner (jsQR v1.4.0, worker-based)
- Fix exit button (native App.exitApp() / toast fallback for web)
- Fix CORS PDF loading via explicit CapacitorHttp.request() — MSAL-safe (no global patch)
- Fix stale MSAL interaction state cleared on native relaunch (prevents interaction_in_progress)
- Remove broken favicon link tags (404 errors)
- Bump service worker cache: docviewer-v2 → docviewer-v3
- allowNavigation for Microsoft login stays in WebView (no Chrome Custom Tab)

## [Android 0.1.0] — 2026-06-24 — First stable Android release
- See Android release notes in release/android/ (future)

---

## Versioning convention

- **GitHub = release only** — push after Docker confirms OK
- **Docker = dev/staging** — deploy via SCP directly from local files
- `release/pwa/X.Y.Z/` — stable PWA snapshot
- `release/android/X.Y.Z/` — stable Android APK snapshot
- Track 0.1.x as long as possible; bump minor (0.2.0) for significant new features
