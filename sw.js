/*
 * Service worker for The Living Way (static site on GitHub Pages).
 *
 * - Pages: network-first, so readers always get the latest text when online;
 *   falls back to the last copy they read, then to /offline.html.
 * - Static assets (css/js/images/fonts/markdown): stale-while-revalidate.
 * - Never touches /api/, PDFs, range requests, or non-GET requests.
 *
 * Bump VERSION when the precache list changes.
 */
const VERSION = "2026-10-05b";
const STATIC_CACHE = `lw-static-${VERSION}`;
const PAGES_CACHE = "lw-pages";
const FONT_HOSTS = ["fonts.googleapis.com", "fonts.gstatic.com"];

const PRECACHE = [
  "/",
  "/offline.html",
  "/paths.html",
  "/public-knowledge/",
  "/public-knowledge/The_Living_Way.html",
  "/css/experience.css",
  "/js/pwa.js",
  "/js/site-nav.js",
  "/css/site-nav.css",
  "/js/sayings-share.js",
  "/images/logo.svg",
  "/images/icon-192.png",
  "/manifest.webmanifest",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) =>
      // Add individually so one missing file cannot block installation.
      Promise.all(PRECACHE.map((url) => cache.add(url).catch(() => {}))),
    ),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("lw-static-") && key !== STATIC_CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

function isCacheableAsset(url) {
  if (FONT_HOSTS.includes(url.hostname)) return true;
  if (url.origin !== self.location.origin) return false;
  if (url.pathname.startsWith("/api/")) return false;
  if (url.pathname.endsWith(".pdf")) return false;
  return true;
}

async function networkFirstPage(request) {
  const cache = await caches.open(PAGES_CACHE);
  try {
    // Revalidate with the server so a fresh deploy shows up immediately,
    // instead of the browser reusing its HTTP-cached copy (max-age=600).
    const response = await fetch(request, { cache: "no-cache" });
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    return (
      (await cache.match(request)) ||
      (await caches.match(request, { ignoreSearch: true })) ||
      (await caches.match("/offline.html")) ||
      Response.error()
    );
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  const fresh = fetch(request)
    .then((response) => {
      if (response.ok || response.type === "opaque") cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached || Response.error());
  return cached || fresh;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET" || request.headers.has("range")) return;
  const url = new URL(request.url);

  if (request.mode === "navigate") {
    if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;
    event.respondWith(networkFirstPage(request));
    return;
  }

  if (isCacheableAsset(url)) {
    event.respondWith(staleWhileRevalidate(request));
  }
});
