const CACHE = "toklo-v1";
const STATIC = ["/", "/index.html", "/favicon.svg", "/manifest.json"];

// External API domains — never cache these, always network
const API_DOMAINS = [
  "api.coingecko.com",
  "infura.io",
  "etherscan.io",
  "opensea.io",
  "ankr.com",
  "simplehash.com",
  "moonpay.com",
  "binance.org",
  "polygon-rpc.com",
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(STATIC)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", e => {
  const url = e.request.url;

  // Never intercept API calls — let them go directly to network
  const isAPI = API_DOMAINS.some(domain => url.includes(domain));
  if (isAPI) return; // don't call e.respondWith — browser handles it normally

  // Never intercept non-GET requests
  if (e.request.method !== "GET") return;

  // Never intercept chrome-extension or non-http
  if (!url.startsWith("http")) return;

  // For app shell — cache first, then network
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(response => {
        // Only cache same-origin static assets
        if (response.ok && url.startsWith(self.location.origin)) {
          const clone = response.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone)).catch(() => {});
        }
        return response;
      }).catch(() => caches.match("/index.html"));
    })
  );
});

// Push notifications
self.addEventListener("push", e => {
  const d = e.data?.json() || {};
  e.waitUntil(
    self.registration.showNotification(d.title || "Toklo", {
      body: d.body || "Check your wallet",
      icon: "/favicon.svg"
    })
  );
});

self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type:"window" }).then(wins => {
      if (wins.length) return wins[0].focus();
      return clients.openWindow("/");
    })
  );
});