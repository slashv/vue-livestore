<script setup lang="ts">
import { queryDb } from '@livestore/livestore'
import { WorkspaceStoreContext } from '../livestore/contexts'
import { workspaceTables, workspaceEvents } from '../livestore/schemas/issueTrackerSchemas'
import Projects from '../components/projects.vue'

const [WorkspaceProvider, useWorkspaceStore] = WorkspaceStoreContext

const workspaceStore = useWorkspaceStore()

const createWorkspace = () => workspaceStore.commit(workspaceEvents.workspaceCreated({
  id: crypto.randomUUID(),
  name: `Workspace: ${crypto.randomUUID()}`,
}))

const workspace = workspaceStore.useQuery(queryDb(workspaceTables.workspaces.first()))
</script>

<template>
  <button
    @click="createWorkspace"
    v-if="!workspace"
  >Create workspace</button>
  <WorkspaceProvider :store-id="workspace.id">
    <template #loading>Loading workspace...</template>
    Workspace: {{ workspace.name }} - Current Project: {{ workspace.currentProjectId }}
    <Projects />
  </WorkspaceProvider>
</template>
