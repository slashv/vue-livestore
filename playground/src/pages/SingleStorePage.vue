<script setup lang="ts">
import { TodoProvider } from '../livestore/todos/store'
import ToDos from '../components/to-dos.vue'
</script>

<template>
  <TodoProvider storeId="todo-store">
    <ToDos />
    <template #loading>Loading store...</template>
  </TodoProvider>
</template>
