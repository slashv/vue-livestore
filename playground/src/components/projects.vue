<script setup lang="ts">
import { ProjectStoreContext, WorkspaceStoreContext } from '../livestore/contexts'
import { queryDb } from '@livestore/livestore'
import { workspaceTables, projectEvents, projectTables, workspaceEvents } from '../livestore/schemas/issueTrackerSchemas'
import Issues from './issues.vue'

const [ProjectProvider, useProjectStore] = ProjectStoreContext
const [_, useWorkspaceStore] = WorkspaceStoreContext

const workspaceStore = useWorkspaceStore()
const workspace = workspaceStore.useQuery(queryDb(workspaceTables.workspaces.first()))

const projectStore = useProjectStore()
const projects = projectStore.useQuery(queryDb(projectTables.projects.where({ workspaceId: workspace.value.id })))

const createProject = () => {
  projectStore.commit(projectEvents.projectCreated({
    id: crypto.randomUUID(),
    name: `Project: ${crypto.randomUUID()}`,
    workspaceId: workspace.value.id,
  }))
}

const setCurrentProject = (projectId: string) => {
  workspaceStore.commit(workspaceEvents.workspaceUpdated({
    id: workspace.value.id,
    currentProjectId: projectId,
  }))
}
</script>

<template>
  <button @click="createProject">Create project</button>
  <div
    v-for="project in projects"
    :key="project.id"
  >
    <ProjectProvider :store-id="`project-${project.id}`">
      <template #loading>Loading project...</template>
      Project: {{ project.name }}
      <button @click="setCurrentProject(project.id)">Set as current project</button>
      <Issues :project-id="project.id" />
    </ProjectProvider>
  </div>
</template>
