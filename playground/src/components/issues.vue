<script setup lang="ts">
import { IssueStoreContext } from '../livestore/stores'
import { queryDb } from '@livestore/livestore'
import { issueEvents, issueTables } from '../livestore/schemas/issueTrackerSchemas'

const props = defineProps<{
  projectId: string
}>()

const [IssueProvider, useIssueStore] = IssueStoreContext

const issueStore = useIssueStore()
const issues = issueStore.useQuery(queryDb(issueTables.issues.where({ projectId: props.projectId })))

const createIssue = () => {
  issueStore.commit(issueEvents.issueCreated({
    id: crypto.randomUUID(),
    name: `Issue: ${crypto.randomUUID()}`,
    projectId: props.projectId,
  }))
}
</script>

<template>
  <IssueProvider :store-id="`issues-${props.projectId}`">
    <template #loading>Loading issues...</template>
    <button @click="createIssue">Create issue</button>
    <div
      v-for="issue in issues"
      :key="issue.id"
    >
      Issue: {{ issue.name }}
    </div>
  </IssueProvider>
</template>
