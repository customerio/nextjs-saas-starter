/**
 * Light, Dark, or System (the default). The choice is saved in localStorage.
 *
 * `themeScript` runs in <head> before the first paint, so the page never
 * flashes the wrong theme. It sets `data-theme="light" | "dark"` on <html>
 * (the resolved theme, which the CSS uses) and `data-theme-choice` (what the
 * person picked, which the switcher shows). In System mode it also follows
 * the OS when it switches between light and dark.
 */

export type ThemeChoice = "light" | "dark" | "system";

export const THEME_STORAGE_KEY = "acme-theme";

/** Browser bar colors, matching --canvas in app/globals.css. */
export const THEME_COLORS = { light: "#f4f5f2", dark: "#111315" } as const;

// Kept as plain ES5-style code in a string: it runs before React and before
// any bundle loads.
export const themeScript = `(function () {
  var KEY = ${JSON.stringify(THEME_STORAGE_KEY)};
  var COLORS = ${JSON.stringify(THEME_COLORS)};
  var media = window.matchMedia("(prefers-color-scheme: dark)");
  function choice() {
    try {
      var saved = localStorage.getItem(KEY);
      return saved === "light" || saved === "dark" ? saved : "system";
    } catch (e) {
      return "system";
    }
  }
  function apply() {
    var picked = choice();
    var theme = picked === "system" ? (media.matches ? "dark" : "light") : picked;
    var root = document.documentElement;
    root.dataset.theme = theme;
    root.dataset.themeChoice = picked;
    var metas = document.querySelectorAll('meta[name="theme-color"]');
    for (var i = 0; i < metas.length; i++) metas[i].setAttribute("content", COLORS[theme]);
  }
  apply();
  // Next.js may write the theme-color tags after this script; update them too.
  document.addEventListener("DOMContentLoaded", apply);
  media.addEventListener("change", apply);
  window.addEventListener("storage", function (event) {
    if (event.key === KEY) apply();
  });
  window.__applyTheme = apply;
})();`;

declare global {
  interface Window {
    __applyTheme?: () => void;
  }
}

/** Saves a choice and applies it right away, without color transitions. */
export function setThemeChoice(choice: ThemeChoice) {
  try {
    if (choice === "system") localStorage.removeItem(THEME_STORAGE_KEY);
    else localStorage.setItem(THEME_STORAGE_KEY, choice);
  } catch {
    // Storage can be blocked (private mode). The theme still applies for this page.
  }
  const root = document.documentElement;
  root.classList.add("theme-switching");
  if (window.__applyTheme) {
    window.__applyTheme();
  } else {
    root.dataset.themeChoice = choice;
  }
  if (choice !== "system" && root.dataset.themeChoice !== choice) {
    // Storage was blocked: apply the explicit choice directly.
    root.dataset.theme = choice;
    root.dataset.themeChoice = choice;
  }
  // Two frames: let the new colors paint before transitions come back.
  requestAnimationFrame(() =>
    requestAnimationFrame(() => root.classList.remove("theme-switching")),
  );
  window.dispatchEvent(new Event("acme-theme-change"));
}

export function readThemeChoice(): ThemeChoice {
  const value = document.documentElement.dataset.themeChoice;
  return value === "light" || value === "dark" ? value : "system";
}
