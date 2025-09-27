<script setup lang="ts">
import { LiveStoreProvider } from 'vue-livestore'
import { makePersistedAdapter } from '@livestore/adapter-web'
import LiveStoreWorker from '../livestore/todos/livestore.worker?worker'
import LiveStoreSharedWorker from '@livestore/adapter-web/shared-worker?sharedworker'
import { schema } from '../livestore/todos/schema'
import ToDos from '../components/to-dos.vue'

const adapter = makePersistedAdapter({
  storage: { type: 'opfs' },
  worker: LiveStoreWorker,
  sharedWorker: LiveStoreSharedWorker,
})

const storeOptions = {
  schema,
  adapter,
  storeId: 'todo-store-single',
}
</script>

<template>
  <Suspense>
    <LiveStoreProvider :options="storeOptions">
      <ToDos />
    </LiveStoreProvider>
    <template #fallback>Loading…</template>
  </Suspense>
</template>
