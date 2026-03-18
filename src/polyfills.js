// Minimal browser polyfills — no Buffer import needed
if (typeof window !== "undefined") {
  window.global  = window.global  ?? window;
  window.process = window.process ?? { env: {}, version: "", browser: true };
}
