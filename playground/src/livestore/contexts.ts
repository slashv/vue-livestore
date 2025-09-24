import { makePersistedAdapter } from '@livestore/adapter-web'
import LiveStoreSharedWorker from '@livestore/adapter-web/shared-worker?sharedworker'
import LiveStoreWorker from '../livestore/livestore.worker?worker'
import { createStoreContext } from 'vue-livestore'
import { workspaceSchema } from './schemas/issueTrackerSchemas'
import { projectSchema } from './schemas/issueTrackerSchemas'
import { issueSchema } from './schemas/issueTrackerSchemas'

const adapter = makePersistedAdapter({
  storage: { type: 'opfs' },
  worker: LiveStoreWorker,
  sharedWorker: LiveStoreSharedWorker,
})

export const WorkspaceStoreContext = createStoreContext({
  name: 'workspace',
  schema: workspaceSchema,
  adapter,
})

export const ProjectStoreContext = createStoreContext({
  name: 'project',
  schema: projectSchema,
  adapter,
})

export const IssueStoreContext = createStoreContext({
  name: 'issue',
  schema: issueSchema,
  adapter,
})
