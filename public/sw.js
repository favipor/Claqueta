// Service worker mínimo: hace que la web se pueda instalar como app.
// No guarda nada en caché (siempre se ve lo último publicado).
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});
