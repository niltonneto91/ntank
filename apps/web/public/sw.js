/**
 * Service Worker do NTANK.
 *
 * Estratégia simples e robusta:
 *   - Pré-cache de assets estáticos críticos (logo, manifest, ícones).
 *   - Network-first para HTML (always fetch when online; fallback ao cache).
 *   - Cache-first para imagens, ícones, fontes e _next/static (tudo
 *     versionado pelo Next, então cache infinito é seguro).
 *
 * Como projetos do usuário ficam em IndexedDB (lib/db.ts), nada relevante
 * de dados depende deste service worker — ele só ajuda no first-paint
 * offline e na velocidade em redes ruins (canteiro de obra).
 */

const VERSION = "ntank-v0.7.0";
const PRECACHE = `${VERSION}-precache`;
const RUNTIME = `${VERSION}-runtime`;

const PRECACHE_URLS = [
  "/",
  "/novo",
  "/manifest.json",
  "/ntank-logo.png",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches
      .open(PRECACHE)
      .then((cache) =>
        cache.addAll(PRECACHE_URLS).catch(() => {
          // se algum asset falhar, segue em frente — não trava o install
        }),
      ),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => !k.startsWith(VERSION))
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Só cacheia same-origin; deixa external (CDN, fonts.gstatic) passar direto.
  if (url.origin !== self.location.origin) return;

  // Network-first para navegação (HTML).
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const clone = res.clone();
          caches.open(RUNTIME).then((c) => c.put(req, clone));
          return res;
        })
        .catch(async () => {
          const cached = await caches.match(req);
          return cached || caches.match("/");
        }),
    );
    return;
  }

  // Cache-first para assets versionados do Next, ícones, imagens.
  const isStatic =
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.match(/\.(png|jpg|jpeg|svg|ico|webp|woff2?|ttf)$/i);

  if (isStatic) {
    event.respondWith(
      caches.match(req).then((cached) => {
        return (
          cached ||
          fetch(req).then((res) => {
            const clone = res.clone();
            caches.open(RUNTIME).then((c) => c.put(req, clone));
            return res;
          })
        );
      }),
    );
    return;
  }

  // Resto: tenta rede com fallback em cache.
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(RUNTIME).then((c) => c.put(req, clone));
        }
        return res;
      })
      .catch(() => caches.match(req)),
  );
});
