<script setup lang="ts">
import { makePersistedAdapter } from '@livestore/adapter-web'
import LiveStoreSharedWorker from '@livestore/adapter-web/shared-worker?sharedworker'
import LiveStoreWorker from './livestore/livestore.worker?worker'
import { schema } from './livestore/schema'
import { LiveStoreProvider } from 'vue-livestore'
import ToDos from './components/to-dos.vue'

const adapter = makePersistedAdapter({
  storage: { type: 'opfs' },
  worker: LiveStoreWorker,
  sharedWorker: LiveStoreSharedWorker,
})

const storeOptions = {
  schema,
  adapter,
  storeId: 'test_store',
}
</script>

<template>
  <Suspense>
    <template #default>
      <LiveStoreProvider :options="storeOptions">
        <ToDos />
      </LiveStoreProvider>
    </template>
    <template #fallback>
      <div>Loading LiveStore...</div>
    </template>
  </Suspense>
</template>
