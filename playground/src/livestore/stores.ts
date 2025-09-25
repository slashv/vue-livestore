import { makePersistedAdapter } from '@livestore/adapter-web'
import LiveStoreSharedWorker from '@livestore/adapter-web/shared-worker?sharedworker'
import LiveStoreWorkspacesWorker from '../livestore/livestore.workspaces.worker?worker'
import { createStoreContext } from 'vue-livestore'
import { schema as workspaceSchema } from './schemas/workspaceSchema'
// import { schema as projectSchema } from './schemas/projectSchema'
// import { schema as issueSchema } from './schemas/issueSchema'

const workspaceAdapter = makePersistedAdapter({
  storage: { type: 'opfs' },
  worker: LiveStoreWorkspacesWorker,
  sharedWorker: LiveStoreSharedWorker,
})

const [WorkspaceProvider, useWorkspaceStore] = createStoreContext({
  name: 'workspace',
  schema: workspaceSchema,
  adapter: workspaceAdapter,
})

export { WorkspaceProvider, useWorkspaceStore }

// const issueAdapter = makePersistedAdapter({
//   storage: { type: 'opfs' },
//   worker: LiveStoreWorker,
//   sharedWorker: LiveStoreSharedWorker,
// })

// const projectAdapter = makePersistedAdapter({
//   storage: { type: 'opfs' },
//   worker: LiveStoreWorker,
//   sharedWorker: LiveStoreSharedWorker,
// })

// export const ProjectStoreContext = createStoreContext({
//   name: 'project',
//   schema: projectSchema,
//   adapter: projectAdapter,
// })

// export const IssueStoreContext = createStoreContext({
//   name: 'issue',
//   schema: issueSchema,
//   adapter: issueAdapter,
// })
