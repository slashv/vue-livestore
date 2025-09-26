<script setup lang="ts">
import { TodoProvider } from '../livestore/todos/store'
import ToDos from '../components/to-dos.vue'
</script>

<template>
  <div>
    <TodoProvider storeId="store-1">
      <Suspense>
        <ToDos />
        <template #fallback>Loading store-1...</template>
      </Suspense>
    </TodoProvider>

    <TodoProvider storeId="store-2">
      <Suspense>
        <ToDos />
        <template #fallback>Loading store-2...</template>
      </Suspense>
    </TodoProvider>
  </div>
</template>
