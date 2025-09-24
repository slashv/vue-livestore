import { createRouter, createWebHistory } from 'vue-router'
import HomePage from './pages/HomePage.vue'
import MultipleInstancesPage from './pages/MultipleInstancesPage.vue'
import NestedStoresPage from './pages/NestedStoresPage.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'Home',
      component: HomePage,
    },
    {
      path: '/multiple-stores',
      name: 'MultipleStores',
      component: MultipleInstancesPage,
    },
    {
      path: '/nested-stores',
      name: 'NestedStores',
      component: NestedStoresPage,
    },
  ],
})

export default router