<script setup lang="ts">
import { TodoProvider } from '../livestore/todos/store'
import ToDosAsync from '../components/to-dos-async.vue'
</script>

<template>
  <div>
    <TodoProvider storeId="store-1">
      <ToDosAsync />
      <template #loading>Loading store-1...</template>
    </TodoProvider>

    <TodoProvider storeId="store-2">
      <ToDosAsync />
      <template #loading>Loading store-2...</template>
    </TodoProvider>
  </div>
</template>
