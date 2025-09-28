<script setup lang="ts">
import { TodoProvider } from '../livestore/todos/store'
import ToDosAsync from '../components/to-dos-async.vue'
</script>

<template>
  <TodoProvider storeId="todo-store">
    <Suspense>
      <ToDosAsync />
      <template #fallback>Loading store...</template>
    </Suspense>
  </TodoProvider>
</template>
