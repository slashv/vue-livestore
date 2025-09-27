<script setup lang="ts">
import { WorkspaceProvider } from '../livestore/workspaces/store'
import Workspace from '../components/workspace.vue'
</script>

<template>
  <WorkspaceProvider store-id="workspace-1">
    <div style="display: flex; flex-direction: column; gap: 10px; margin: 10px 0px;">
      <Workspace />
    </div>
    <template #loading>Loading workspace...</template>
  </WorkspaceProvider>
</template>
