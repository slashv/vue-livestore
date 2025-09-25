<script setup lang="ts">
import { TodoProvider as TodoStoreProvider, useTodoStore } from '../livestore/todos/store'
import ToDos from '../components/to-dos.vue'
</script>

<template>
  <div>
    <TodoStoreProvider storeId="store-1">
      <template #loading>Loading store-1...</template>
      <template #default>
        <h3>Store 1</h3>
        <ToDos />
      </template>
    </TodoStoreProvider>

    <TodoStoreProvider storeId="store-2">
      <template #loading>Loading store-2...</template>
      <template #default>
        <h3>Store 2</h3>
        <ToDos />
      </template>
    </TodoStoreProvider>
  </div>
</template>
