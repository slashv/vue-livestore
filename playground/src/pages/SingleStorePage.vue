<script setup lang="ts">
import { TodoProvider as StoreProvider, useTodoStore as useStore } from '../livestore/todos/store'
import ToDos from '../components/to-dos.vue'
</script>

<template>
  <StoreProvider storeId="todo-store">
    <template #loading>Loading...</template>
    <ToDos />
  </StoreProvider>
</template>
