<script setup lang="ts">
import { TodoProvider } from '../livestore/todos/store'
import ToDos from '../components/to-dos.vue'
</script>

<template>
  <div>
    <TodoProvider storeId="store-1">
      <ToDos />
      <template #loading>Loading store-1...</template>
    </TodoProvider>

    <TodoProvider storeId="store-2">
      <ToDos />
      <template #loading>Loading store-2...</template>
    </TodoProvider>
  </div>
</template>
