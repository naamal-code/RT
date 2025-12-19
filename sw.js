/* sw.js - offline cache for this PWA */

const CACHE_NAME = "data-calc-v4"; // 更新したら v3, v4... に上げる

// キャッシュするのは「本当に必要な最小限」に限定
const PRECACHE_URLS = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-512-maskable.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(PRECACHE_URLS);
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : Promise.resolve()))
      );
      await self.clients.claim();
    })()
  );
});

// helper: ルートに戻すためのHTMLフォールバック
async function offlineHTMLFallback() {
  // まず ./ を探し、なければ index.html
  return (await caches.match("./")) || (await caches.match("./index.html"));
}

// fetch strategy:
// - navigation(HTML): network-first（成功したら“そのURL”を更新キャッシュ）→ 失敗ならフォールバック
// - それ以外: cache-first（ただしプリキャッシュ対象のもの中心。無闇に増やさない）
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // 同一オリジンのみ
  if (url.origin !== self.location.origin) return;

  // navigation: network-first
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req);
          const cache = await caches.open(CACHE_NAME);
          // index固定じゃなく、実際に開いたURLに対して更新
          cache.put(req, fresh.clone());
          return fresh;
        } catch {
          return offlineHTMLFallback();
        }
      })()
    );
    return;
  }

  // GET以外は触らない
  if (req.method !== "GET") return;

  event.respondWith(
    (async () => {
      const cached = await caches.match(req);
      if (cached) return cached;

      // ここで「何でもキャッシュ」しない。必要になったら追加する方が安全。
      // ただし PRECACHE_URLS に含まれるものに近いパスだけはキャッシュして良い。
      const pathname = url.pathname;
      const isStaticLike =
        pathname.endsWith(".css") ||
        pathname.endsWith(".js") ||
        pathname.endsWith(".webmanifest") ||
        pathname.endsWith(".png") ||
        pathname.endsWith(".svg") ||
        pathname.endsWith(".ico");

      try {
        const res = await fetch(req);
        if (res.ok && isStaticLike) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(req, res.clone());
        }
        return res;
      } catch (e) {
        // オフラインで未キャッシュだった場合はここに来る
        return cached || Response.error();
      }
    })()
  );

});

