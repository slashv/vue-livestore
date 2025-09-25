<script setup lang="ts">
import { inject } from 'vue'
import { useWorkspaceStore, tables as workspaceTables, events as workspaceEvents } from '../livestore/workspaces/store'
import { useStore } from 'vue-livestore'
import { queryDb } from '@livestore/livestore'
import Projects from './projects.vue'

// const [_workspaceProvider, useWorkspaceStore] = WorkspaceStoreContext
// const [ProjectProvider, _useProjectStore] = ProjectStoreContext

// const createWorkspace = () => {
//   workspaceStore.commit(workspaceEvents.workspaceCreated({
//     id: crypto.randomUUID(),
//     name: `Workspace: ${crypto.randomUUID()}`,
//   }))
// }

const workspaceStore = useWorkspaceStore()

// workspaceStore.commit(workspaceEvents.workspaceCreated({
//   id: crypto.randomUUID(),
//   name: `Workspace: ${crypto.randomUUID()}`,
// }))


const workspaces = workspaceStore.useQuery(queryDb(workspaceTables.workspaces.select()))
</script>

<template>
  Workspace storeId: {{ workspaceStore.storeId }}
  {{ workspaces }}
  <!-- Workspace: {{ workspace }} -->
  <!-- <button
    v-if="!workspace"
    @click="createWorkspace"
  >Create workspace</button>
  <ProjectProvider
    v-if="workspace"
    :store-id="`project-${workspace.currentProjectId}`"
  >
    <template #loading>Loading project...</template>
<Projects />
</ProjectProvider> -->
</template>
