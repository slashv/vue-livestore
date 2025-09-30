<script setup lang="ts">
import { TodoProvider } from '../livestore/todos/store'
import ToDoAsync from '../components/to-dos-async.vue'
</script>

<template>
  <TodoProvider storeId="todo-store">
    <Suspense>
      <ToDoAsync />
      <template #fallback>Loading store...</template>
    </Suspense>
  </TodoProvider>
</template>
