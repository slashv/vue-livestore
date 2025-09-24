<script setup lang="ts">
import { makePersistedAdapter } from '@livestore/adapter-web'
import LiveStoreSharedWorker from '@livestore/adapter-web/shared-worker?sharedworker'
import LiveStoreWorker from '../livestore/livestore.worker?worker'
import { schema } from '../livestore/schema'
import { createStoreContext } from 'vue-livestore'
import TodosComponent from '../components/to-dos.vue'
import { provide } from 'vue'

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

const TodoInstanceContent = {
  components: { TodosComponent },
  setup() {
    const store = useTodoStore()
    provide('store', store)
    return {}
  },
  template: `<TodosComponent />`,
}
</script>

<template>
  <div>
    <TodoStoreProvider storeId="store-1">
      <template #loading>Loading store-1...</template>
      <h3>Store 1</h3>
      <TodoInstanceContent />
    </TodoStoreProvider>

    <TodoStoreProvider storeId="store-2">
      <template #loading>Loading store-2...</template>
      <h3>Store 2</h3>
      <TodoInstanceContent />
    </TodoStoreProvider>
  </div>
</template>
