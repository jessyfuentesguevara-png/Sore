// Nombre de la versión de la caché; al cambiarlo, el navegador renueva los archivos guardados.
// Se subió a v3 porque cambiaron las pantallas y se agregaron imágenes y auth.js.
const VERSION = 'sore-v6';

// Archivos guardados para abrir sin internet.
// Las imágenes de la mascota solo se agregan cuando existe la pantalla que las usa
// (por ahora: splash y asomada para login).
const ARCHIVOS = [
  './', 'index.html', 'css/styles.css', 'css/config.css', 'css/principal.css',
  'js/app.js', 'js/auth.js', 'js/config.js', 'js/datos.js', 'js/principal.js', 'js/pedido.js',
  'manifest.webmanifest',
  'icons/icon-192.png', 'icons/icon-512.png',
  'img/mascota-splash.png', 'img/mascota-asomada.png', 'img/mascota-bandera.png', 'img/mascota-olla.png'
];

// Al instalarse: guarda en caché los archivos básicos
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(ARCHIVOS)));
  self.skipWaiting(); // activa esta versión sin esperar
});

// Al activarse: borra las cachés de versiones anteriores (sore-v1, sore-v2)
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
