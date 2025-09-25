<script setup lang="ts">
import {
  useProjectStore,
  tables as projectTables,
  events as projectEvents
} from '../livestore/projects/store'
import {
  useWorkspaceStore,
  tables as workspaceTables
} from '../livestore/workspaces/store'
import { IssueProvider } from '../livestore/issues/store'
import { queryDb } from '@livestore/livestore'
import Issues from './issues.vue'

const projectStore = useProjectStore()
const projects = projectStore.useQuery(queryDb(projectTables.projects.select()))

const workspaceStore = useWorkspaceStore()
const workspace = workspaceStore.useQuery(queryDb(workspaceTables.workspaces.first()))

const createProject = () => {
  projectStore.commit(projectEvents.projectCreated({
    id: crypto.randomUUID(),
    name: `Project: ${crypto.randomUUID()}`,
    workspaceId: workspace.value.id,
  }))
}
</script>

<template>
  <strong>{{ workspace.name }}</strong>
  <button @click="createProject">Create project</button>
  <div
    v-for="project in projects"
    :key="project.id"
    style="display: flex; flex-direction: column; gap: 10px; margin: 10px 0px;"
  >
    <i>{{ project.name }} </i>
    <IssueProvider :store-id="`issues-${project.id}`">
      <template #loading>Loading issues...</template>
      <Issues />
    </IssueProvider>
  </div>
</template>
