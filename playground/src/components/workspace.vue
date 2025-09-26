<script setup lang="ts">
import {
  useWorkspaceStore,
  tables as workspaceTables,
  events as workspaceEvents,
} from '../livestore/workspaces/store'
import { ProjectProvider } from '../livestore/projects/store'
import { queryDb } from '@livestore/livestore'
import Projects from './projects.vue'

const createWorkspace = () => {
  workspaceStore.commit(workspaceEvents.workspaceCreated({
    id: crypto.randomUUID(),
    name: `Workspace: ${crypto.randomUUID()}`,
  }))
}

const workspaceStore = useWorkspaceStore()
const workspaces = workspaceStore.useQuery(queryDb(workspaceTables.workspaces.select()))
</script>

<template>
  <button
    @click="createWorkspace"
    v-if="workspaces.length === 0"
  >Create workspace</button>
  <ProjectProvider
    v-for="workspace in workspaces"
    :key="workspace.id"
    :store-id="`project-${workspace.id}`"
  >
    <template #loading>Loading project...</template>
    <Projects />
  </ProjectProvider>
</template>
