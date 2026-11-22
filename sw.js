// Service worker source. render.py writes it to /sw.js with a new VERSION on every build.
var VERSION = "19258315ad";
var CACHE = "plan-" + VERSION;
var FONTS = "fonts-v1";
var CORE = ["./", "manifest.webmanifest", "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png"];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(CORE); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE && k !== FONTS; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener("fetch", function (e) {
  var req = e.request, url = new URL(req.url);
  if (req.method !== "GET") return;
  // Live data (recovery tiles): always straight to the network.
  if (url.origin === self.location.origin && url.pathname.indexOf("/api/") === 0) return;

  // The plan page: network first so edits show up, cached copy when offline.
  if (req.mode === "navigate") {
    e.respondWith(fetch(req, { cache: "no-store" }).then(function (res) {
      var copy = res.clone();
      caches.open(CACHE).then(function (c) { c.put("./", copy); });
      return res;
    }).catch(function () {
      return caches.match("./", { ignoreSearch: true });
    }));
    return;
  }

  // Google Fonts: serve from cache, refresh in the background.
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    e.respondWith(caches.open(FONTS).then(function (c) {
      return c.match(req).then(function (hit) {
        var net = fetch(req).then(function (res) { if (res.ok || res.type === "opaque") c.put(req, res.clone()); return res; });
        return hit || net;
      });
    }));
    return;
  }

  // Own static files (icons, manifest): cache first.
  if (url.origin === self.location.origin) {
    e.respondWith(caches.match(req).then(function (hit) { return hit || fetch(req); }));
  }
});
