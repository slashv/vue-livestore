<script setup lang="ts">
import { useIssueStore, tables as issueTables, events as issueEvents } from '../livestore/issues/store'
import { useProjectStore, tables as projectTables } from '../livestore/projects/store'
import { queryDb } from '@livestore/livestore'

const projectStore = await useProjectStore()
const project = projectStore.useQuery(queryDb(projectTables.projects.first()))

const issueStore = await useIssueStore()
const issues = issueStore.useQuery(queryDb(issueTables.issues.where({ projectId: project.value.id })))

const createIssue = () => {
  issueStore.commit(issueEvents.issueCreated({
    id: crypto.randomUUID(),
    name: `Issue: ${crypto.randomUUID()}`,
    projectId: project.value.id,
  }))
}
</script>

<template>
  <button @click="createIssue">Create issue</button>
  <div
    v-for="issue in issues"
    :key="issue.id"
  >
    {{ issue.name }}
  </div>
</template>
