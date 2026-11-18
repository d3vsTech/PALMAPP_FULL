// Permite abrir PalmApp sin señal. Guarda la aplicación, no los datos de la finca.
// Al cambiar esta versión se borra lo guardado por la anterior.
const CACHE = 'palmapp-v1';
const BASE = ['/', '/manifest.webmanifest', '/favicon.svg', '/icon-192.png', '/icon-512.png'];
const ARCHIVO = /\/assets\/[\w.-]+\.\w+/g;

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await cache.addAll(BASE);
      // Los archivos que ya cargó la primera visita no pasan por aquí: se guardan desde el inicio.
      const html = await (await cache.match('/', { ignoreVary: true })).text();
      const archivos = new Set([...html.matchAll(ARCHIVO)].map((m) => m[0]));
      // Los logos y demás imágenes solo aparecen nombrados dentro del código.
      for (const archivo of [...archivos]) {
        const codigo = await (await fetch(archivo)).text();
        for (const m of codigo.matchAll(ARCHIVO)) archivos.add(m[0]);
      }
      await cache.addAll([...archivos]);
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const nombres = await caches.keys();
      await Promise.all(nombres.filter((n) => n !== CACHE).map((n) => caches.delete(n)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  // Las pantallas buscan primero la versión más reciente y, sin señal, usan la guardada.
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE);
        try {
          const respuesta = await fetch(request);
          if (respuesta.ok) await cache.put('/', respuesta.clone());
          return respuesta;
        } catch {
          return (await cache.match('/', { ignoreVary: true })) ?? Response.error();
        }
      })()
    );
    return;
  }

  // Los archivos de /assets cambian de nombre con cada versión: lo guardado siempre es válido.
  if (url.pathname.startsWith('/assets/') || BASE.includes(url.pathname)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE);
        // ignoreVary: el mismo archivo se pide de varias formas y sigue siendo el mismo.
        const guardada = await cache.match(request, { ignoreVary: true });
        if (guardada) return guardada;
        const respuesta = await fetch(request);
        if (respuesta.ok) await cache.put(request, respuesta.clone());
        return respuesta;
      })()
    );
  }
});
