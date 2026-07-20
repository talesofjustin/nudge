export const THEME_COOKIE = "nudge-theme";

// One year — the DB value (user_settings.theme) is the real source of
// truth for cross-device sync; this cookie only exists so the server can
// render the right data-theme attribute on first paint, before any client
// JS or DB round-trip has happened.
export function setThemeCookie(theme: "light" | "dark" | "system") {
  document.cookie = `${THEME_COOKIE}=${theme}; path=/; max-age=31536000; samesite=lax`;
}
