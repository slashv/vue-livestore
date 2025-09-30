<script setup lang="ts">
import { TodoProvider } from '../livestore/todos/store'
import ToDoAsync from '../components/to-dos-async.vue'
</script>

<template>
  <Suspense>
    <div>
      <TodoProvider storeId="store-1">
        <ToDoAsync />
      </TodoProvider>

      <TodoProvider storeId="store-2">
        <ToDoAsync />
      </TodoProvider>
    </div>
    <template #fallback>Loading stores with suspense...</template>
  </Suspense>
</template>
