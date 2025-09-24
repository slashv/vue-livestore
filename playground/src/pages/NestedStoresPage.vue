<script setup lang="ts">
import { queryDb } from '@livestore/livestore'
import { makePersistedAdapter } from '@livestore/adapter-web'
import LiveStoreSharedWorker from '@livestore/adapter-web/shared-worker?sharedworker'
import LiveStoreWorker from '../livestore/livestore.worker?worker'
import { schema, events, tables } from '../livestore/schema'
import { userSchema, userTables } from '../livestore/userSchema'
import { createStoreContext } from 'vue-livestore'

const adapter = makePersistedAdapter({
  storage: { type: 'opfs' },
  worker: LiveStoreWorker,
  sharedWorker: LiveStoreSharedWorker,
})

const [UserStoreProvider, useUserStore] = createStoreContext({
  name: 'User',
  schema: userSchema,
  storeId: 'user-store',
  adapter,
})
</script>

<template>
  <UserStoreProvider>
    <template #loading>Loading users...</template>
    <NestedAppContent />
  </UserStoreProvider>
</template>
