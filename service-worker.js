// Nombre de la versión de la caché; al cambiarlo, el navegador renueva los archivos guardados
const VERSION = 'sore-v2';

// Archivos que se guardan para que la app abra sin internet
const ARCHIVOS = ['./', 'index.html', 'css/styles.css', 'js/app.js'];

// Al instalarse: guarda en caché los archivos básicos
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(ARCHIVOS)));
  self.skipWaiting(); // activa esta versión sin esperar
});

// Al activarse: borra las cachés de versiones anteriores (por ejemplo sore-v1)
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((nombres) =>
      Promise.all(nombres.filter((n) => n !== VERSION).map((n) => caches.delete(n)))
    )
  );
});

// Al pedir un archivo: usa la caché y, si no está, lo pide a internet
self.addEventListener('fetch', (e) => {
  e.respondWith(caches.match(e.request).then((r) => r || fetch(e.request)));
});
