<script setup lang="ts">
import { WorkspaceProvider } from '../livestore/stores'
import Workspace from '../components/workspace.vue'
</script>

<template>
  <WorkspaceProvider store-id="workspace-1">
    <template #loading>Loading workspace...</template>
    <Workspace />
  </WorkspaceProvider>
</template>
