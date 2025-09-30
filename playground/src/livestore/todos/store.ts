import { makePersistedAdapter } from '@livestore/adapter-web'
import LiveStoreSharedWorker from '@livestore/adapter-web/shared-worker?sharedworker'
import LiveStoreWorker from './livestore.worker?worker'
import { createStoreContext } from 'vue-livestore'
import { schema } from './schema'

const adapter = makePersistedAdapter({
  storage: { type: 'opfs' },
  worker: LiveStoreWorker,
  sharedWorker: LiveStoreSharedWorker,
})

export const [TodoProvider, useTodoStore] = createStoreContext({
  name: 'todo',
  schema: schema,
  adapter: adapter,
})

export { schema, tables, events } from './schema'
