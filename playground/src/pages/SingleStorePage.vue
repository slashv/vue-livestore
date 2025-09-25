<script setup lang="ts">
import { makePersistedAdapter } from '@livestore/adapter-web'
import LiveStoreSharedWorker from '@livestore/adapter-web/shared-worker?sharedworker'
import LiveStoreWorker from '../livestore/livestore.todos.worker?worker'
import { schema } from '../livestore/schemas/todoSchema'
import { createStoreContext } from 'vue-livestore'
import ToDos from '../components/to-dos.vue'

const adapter = makePersistedAdapter({
  storage: { type: 'opfs' },
  worker: LiveStoreWorker,
  sharedWorker: LiveStoreSharedWorker,
})

const [StoreProvider, useStore] = createStoreContext({
  name: 'todo',
  schema: schema,
  adapter: adapter,
  storeId: 'todo-store',
})
</script>

<template>
  <StoreProvider>
    <template #loading>Loading...</template>
    <ToDos />
  </StoreProvider>
</template>
