import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  { path: '/', redirect: '/timeline' },
  { path: '/timeline', name: 'timeline', component: () => import('@/views/TimelineView.vue') },
  { path: '/stage/:id', name: 'stage', component: () => import('@/views/StageView.vue'), props: true },
  { path: '/album/:id', name: 'album', component: () => import('@/views/AlbumView.vue'), props: true },
  { path: '/albums', name: 'albums', component: () => import('@/views/AlbumsView.vue') },
  { path: '/map', name: 'map', component: () => import('@/views/MapView.vue') },
  { path: '/people', name: 'people', component: () => import('@/views/PeopleView.vue') },
  { path: '/person/:id', name: 'person', component: () => import('@/views/PersonView.vue'), props: true },
  { path: '/places', name: 'places', component: () => import('@/views/PlacesView.vue') },
  { path: '/place/:id', name: 'place', component: () => import('@/views/PlaceView.vue'), props: true },
  { path: '/photo/:id', name: 'photo', component: () => import('@/views/PhotoView.vue'), props: true },
  { path: '/search', name: 'search', component: () => import('@/views/SearchView.vue') },
  { path: '/settings', name: 'settings', component: () => import('@/views/SettingsView.vue') },
  { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('@/views/NotFoundView.vue') },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(_to, _from, saved) {
    return saved ?? { top: 0 }
  },
})

export default router
