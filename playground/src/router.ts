import { createRouter, createWebHistory } from 'vue-router'
import SingleStorePage from './pages/SingleStorePage.vue'
import MultipleStoresPage from './pages/MultipleStoresPage.vue'
import MultipleStoresSuspensePage from './pages/MultipleStoresSuspensePage.vue'
import NestedStoresPage from './pages/NestedStoresPage.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'Home',
      component: SingleStorePage,
    },
    {
      path: '/multiple-stores',
      name: 'MultipleStores',
      component: MultipleStoresPage,
    },
    {
      path: '/multiple-stores-suspense',
      name: 'MultipleStoresSuspense',
      component: MultipleStoresSuspensePage,
    },
    {
      path: '/nested-stores',
      name: 'NestedStores',
      component: NestedStoresPage,
    },
  ],
})

export default router
