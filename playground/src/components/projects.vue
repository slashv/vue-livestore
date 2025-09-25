<script setup lang="ts">
import { ProjectStoreContext, WorkspaceStoreContext } from '../livestore/stores'
import { queryDb } from '@livestore/livestore'
import { workspaceTables, projectEvents, projectTables, workspaceEvents } from '../livestore/schemas/issueTrackerSchemas'

const [_workspaceProvider, useWorkspaceStore] = WorkspaceStoreContext
const [_ProjectProvider, useProjectStore] = ProjectStoreContext

const projectStore = useProjectStore()
const project = projectStore.useQuery(queryDb(projectTables.projects.first()))

const workspaceStore = useWorkspaceStore()
const workspace = workspaceStore.useQuery(queryDb(workspaceTables.workspaces.where({ id: project.value.workspaceId }).first()))
</script>

<template>
  Project: {{ project.name }} - Workspace: {{ workspace.name }}
</template>
