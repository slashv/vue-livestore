<script setup lang="ts">
import { TodoProvider } from '../livestore/todos/store'
import ToDoAsync from '../components/to-dos-async.vue'
</script>

<template>
  <div>
    <Suspense>
      <TodoProvider storeId="store-1">
        <ToDoAsync />
      </TodoProvider>
      <template #fallback>Loading store-1...</template>
    </Suspense>

    <Suspense>
      <TodoProvider storeId="store-2">
        <ToDoAsync />
      </TodoProvider>
      <template #fallback>Loading store-2...</template>
    </Suspense>
  </div>
</template>
