<script setup lang="ts">
import { makePersistedAdapter } from '@livestore/adapter-web'
import LiveStoreSharedWorker from '@livestore/adapter-web/shared-worker?sharedworker'
import LiveStoreWorker from '../livestore/livestore.worker?worker'
import { schema } from '../livestore/schemas/todoSchema'
import { createStoreContext } from 'vue-livestore'
// import TodoInstanceWrapper from '../components/TodoInstanceWrapper.vue'
import ToDos from '../components/to-dos.vue'

const adapter = makePersistedAdapter({
  storage: { type: 'opfs' },
  worker: LiveStoreWorker,
  sharedWorker: LiveStoreSharedWorker,
})

const [TodoStoreProvider, useTodoStore] = createStoreContext({
  name: 'MultiInstanceTodoStore',
  schema,
  adapter,
})
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
