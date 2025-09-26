<script setup lang="ts">
import { TodoProvider } from '../livestore/todos/store'
import ToDos from '../components/to-dos.vue'
</script>

<template>
  <div>
    <TodoProvider storeId="store-1">
      <template #loading>Loading store-1...</template>
      <template #default>
        <h3>Store 1</h3>
        <ToDos />
      </template>
    </TodoProvider>

    <TodoProvider storeId="store-2">
      <template #loading>Loading store-2...</template>
      <template #default>
        <h3>Store 2</h3>
        <ToDos />
      </template>
    </TodoProvider>
  </div>
</template>
