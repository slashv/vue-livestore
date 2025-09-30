<script setup lang="ts">
import { LiveStoreProvider } from 'vue-livestore'
import { makePersistedAdapter } from '@livestore/adapter-web'
import LiveStoreSharedWorker from '@livestore/adapter-web/shared-worker?sharedworker'
import LiveStoreWorker from '../livestore/todos/livestore.worker?worker'
import { schema } from '../livestore/todos/schema'
import ToDos from '../components/to-dos.vue'

const adapter = makePersistedAdapter({
  storage: { type: 'opfs' },
  worker: LiveStoreWorker,
  sharedWorker: LiveStoreSharedWorker,
})
</script>

<template>
  <LiveStoreProvider :options="{ schema, adapter, storeId: 'todo-store' }">
    <ToDos />
    <template #loading>Loading store...</template>
  </LiveStoreProvider>
</template>
