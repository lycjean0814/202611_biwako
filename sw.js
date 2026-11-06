"use strict";

/*
 * 依 Service Worker 所在的 repository 路徑產生專屬快取名稱。
 *
 * 例如：
 * /202611_biwako/sw.js
 * → travel-pwa-202611_biwako-v1
 *
 * 不同 GitHub Pages repository 不會共用同一個快取名稱。
 */

const scopePath = new URL(self.registration.scope).pathname
  .replace(/\/+$/, "")
  .split("/")
  .pop() || "root";

const CACHE_PREFIX = `travel-pwa-${scopePath}-`;
const CACHE_NAME = `${CACHE_PREFIX}v1`;

const SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./trip-data.json",
  "./manifest.json",
  "./icon.svg"
];

/* ---------- Install ---------- */

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

/* ---------- Activate ---------- */

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => {
        const oldCaches = keys.filter((key) =>
          key.startsWith(CACHE_PREFIX) &&
          key !== CACHE_NAME
        );

        return Promise.all(
          oldCaches.map((key) => caches.delete(key))
        );
      })
      .then(() => self.clients.claim())
  );
});

/* ---------- Fetch ---------- */

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") return;

  const url = new URL(request.url);
  const scopeUrl = new URL(self.registration.scope);

  // 僅處理本 PWA 範圍內的資源。
  if (url.origin !== scopeUrl.origin ||
      !url.pathname.startsWith(scopeUrl.pathname)) {
    return;
  }

  event.respondWith(handleRequest(request));
});

async function handleRequest(request) {
  const cache = await caches.open(CACHE_NAME);
  const url = new URL(request.url);

  /* 行程資料：網路優先，離線時使用快取 */

  if (url.pathname.endsWith("/trip-data.json")) {
    try {
      const response = await fetch(request, {
        cache: "no-store"
      });

      if (response.ok) {
        await cache.put(request, response.clone());
      }

      return response;
    } catch (error) {
      const cached = await cache.match(request);

      if (cached) return cached;

      return new Response(
        JSON.stringify({
          error: "目前無法連線，且沒有可用的離線行程資料。"
        }),
        {
          status: 503,
          headers: {
            "Content-Type": "application/json; charset=utf-8"
          }
        }
      );
    }
  }

  /* HTML：網路優先，離線時回傳首頁 */

  if (request.mode === "navigate") {
    try {
      const response = await fetch(request, {
        cache: "no-store"
      });

      if (response.ok) {
        const indexUrl = new URL("./index.html", self.registration.scope);
        await cache.put(indexUrl.href, response.clone());
      }

      return response;
    } catch (error) {
      const indexUrl = new URL("./index.html", self.registration.scope);
      const cached = await cache.match(indexUrl.href);

      if (cached) return cached;

      return new Response(
        "目前離線，請先連線開啟一次行程頁面。",
        {
          status: 503,
          headers: {
            "Content-Type": "text/plain; charset=utf-8"
          }
        }
      );
    }
  }

  /* 其他靜態資源：網路優先，離線時使用快取 */

  try {
    const response = await fetch(request, {
      cache: "no-store"
    });

    if (response.ok) {
      await cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    const cached = await cache.match(request);

    if (cached) return cached;

    return new Response("目前無法取得此資源。", {
      status: 503,
      headers: {
        "Content-Type": "text/plain; charset=utf-8"
      }
    });
  }
}