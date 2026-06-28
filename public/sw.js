/**
 * PMS Service Worker
 *
 * 提供离线缓存与导航回退能力：
 * - 安装阶段缓存应用外壳（index.html、manifest、图标）。
 * - _fetch_ 阶段优先读缓存，未命中则请求并缓存静态资源与图片。
 * - 导航请求离线时回退到已缓存的 index.html（SPA 行为）。
 */

const CACHE_NAME = 'pms-cache-v1'
const SHELL_ASSETS = ['/', '/index.html', '/manifest.json', '/favicon.svg', '/pwa-192x192.png', '/pwa-512x512.png']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  const isNavigation = request.mode === 'navigate'
  const isStaticAsset =
    url.origin === self.location.origin &&
    /\.(?:js|css|html|json|svg|png|jpg|jpeg|webp|woff2?|ttf|otf)(\?.*)?$/.test(url.pathname)
  const isImage = /\.(?:png|jpg|jpeg|webp|svg)(\?.*)?$/.test(url.pathname)

  if (!isNavigation && !isStaticAsset && !isImage) return

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached

      return fetch(request)
        .then((response) => {
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response
          }
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
          return response
        })
        .catch(() => {
          if (isNavigation) {
            return caches.match('/index.html')
          }
          return undefined
        })
    }),
  )
})
