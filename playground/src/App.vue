<template>
  <div style="padding: 4rem; max-width: 800px;">
    <nav>
      <router-link to="/">Single Store</router-link> |
      <router-link to="/multiple-stores">Multiple Stores</router-link> |
      <router-link to="/multiple-stores-suspense">Multiple Stores Suspense</router-link> |
      <router-link to="/nested-stores">Nested Stores</router-link>
    </nav>
    <router-view />
  </div>
</template>
