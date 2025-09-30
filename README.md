# Vue bindings for LiveStore

Vue LiveStore is in beta with intention to mature alongside [LiveStore](https://livestore.dev/). Happy to accept suggestions for improvement and contributions. See list of todos below for pending areas.

## Installation

It's strongly recommended to use `bun` or `pnpm` for the simplest and most reliable dependency setup (see [note on package management](https://docs.livestore.dev/misc/package-management/) for more details).

**Install LiveStore**
```bash
pnpm install @livestore/livestore @livestore/wa-sqlite@1.0.5-dev.2 @livestore/adapter-web @livestore/utils @livestore/peer-deps @livestore/devtools-vite
```
**Install vue-livestore**
```bash
pnpm install vue-livestore
```

## Key components:

**LiveStoreProvider**: Creates the store and provides it to the rest of the wrapped app.

**useStore()**: Composables to load (inject) the store

**useQuery()**: Composable to create reactive read-only live queries

**useClientDocument()**: Composable to get reactive writable client state variables

## Usage

**For full working example see code in [playground](https://github.com/slashv/vue-livestore/tree/main/playground).**

Follow the [Vue LiveStore example for an existing project](https://docs.livestore.dev/getting-started/vue/) to:
1. Adjust Vite config
2. Create livestore/livestore.worker.ts
3. Create livestore/schema.ts

### Wrap your app in a LiveStoreProvider

```vue
<template>
  <LiveStoreProvider :options="{ schema, adapter, storeId }">
    <Todos />
  </LiveStoreProvider>
</template>
```

### useStore and useQuery composables

```ts
import { queryDb } from '@livestore/livestore'
import { events, tables } from '../livestore/schema'
import { useStore, useQuery } from 'vue-livestore'

const { store } = useStore()

const visibleTodos$ = queryDb(
  () => tables.todos.where({ deletedAt: null, })
  { label: 'visibleTodos' },
)
const todosQuery = useQuery(visibleTodos$)

store.commit(events.todoCreated({ id: crypto.randomUUID(), text: "Write documentation" }))
```

### useClientDocument

**🚨 useClientDocument interface is experimental and might change**

Serializes the client document variables into writable computed refs directly from the composable which allows us to write code like this:

```vue
<script setup lang="ts">
import { tables } from '../livestore/schema'

const { newTodoText, filters } = useClientDocument(tables.uiState)
</script>

<template>
<input type="text" v-model="newTodoText">

<select v-model="filters">
  <option value="all">All</option>
  ...
<select>
</template>
```

## Multiple Store Instances

Vue LiveStore supports running multiple store instances using `createStoreContext`. This can be useful when isolation between stores is necessary to provide more fine grained permissions say between workspaces and projects.

When working with multiple stores it's recommended to create the store using `createStoreContext` in a separate file then import the provider or useStore composable in different parts of the app. See examples in playground for reference.

In order to work with `<Suspense>` as a common boundary for multiple stores **the `useStore` composable returned by `createStoreContext` returns a promise**. This is different to the React implenentation because of the way Suspense works differently in both frameworks. [See this document](docs/multi-store/react-vs-vue-suspense.md) for more details.

### Creating a Store Context

Create a store context file (e.g., `livestore/todos/store.ts`) that exports both a Provider component and a composable:

```ts
import { makePersistedAdapter } from '@livestore/adapter-web'
import LiveStoreWorker from './livestore.worker?worker'
import { createStoreContext } from 'vue-livestore'
import { schema } from './schema'

const adapter = makePersistedAdapter({
  storage: { type: 'opfs' },
  worker: LiveStoreWorker,
})

// Creates a typed Provider and useStore hook for this specific store type
export const [TodoProvider, useTodoStore] = createStoreContext({
  name: 'todo',
  schema: schema,
  adapter: adapter,
})
```

### Using Multiple Store Instances

**⚠️ Important**: The `useStore` returned by `createStoreContext` returns a **Promise** to support Vue's Suspense. You must use `await` or handle it as a promise.

**Loading States**: When using multiple stores, you must handle loading states using **either**:
1. The `#loading` slot on each `Provider` component, or
2. A parent `<Suspense>` boundary wrapping the providers

#### Option 1: Using Loading Slots

```vue
<script setup lang="ts">
import { TodoProvider } from '../livestore/todos/store'
</script>

<template>
  <div>
    <TodoProvider storeId="store-1">
      <TodoList />
      <template #loading>Loading store-1...</template>
    </TodoProvider>

    <TodoProvider storeId="store-2">
      <TodoList />
      <template #loading>Loading store-2...</template>
    </TodoProvider>
  </div>
</template>
```

The `TodoList` component uses `await` to access the store:

```vue
<script setup lang="ts">
import { queryDb } from '@livestore/livestore'
import { events, tables } from '../livestore/todos/schema'
import { useTodoStore } from '../livestore/todos/store'

const store = await useTodoStore()

const visibleTodos$ = queryDb(
  () => tables.todos.where({ deletedAt: null })
)
const todos = store.useQuery(visibleTodos$)

const createTodo = (text: string) => {
  store.commit(events.todoCreated({ id: crypto.randomUUID(), text }))
}
</script>

<template>
  <div v-for="todo in todos" :key="todo.id">
    {{ todo.text }}
  </div>
</template>
```

#### Option 2: Using Suspense

```vue
<script setup lang="ts">
import { TodoProvider } from '../livestore/todos/store'
</script>

<template>
  <Suspense>
    <div>
      <TodoProvider storeId="store-1">
        <TodoList />
      </TodoProvider>

      <TodoProvider storeId="store-2">
        <TodoList />
      </TodoProvider>
    </div>
    <template #fallback>Loading stores with suspense...</template>
  </Suspense>
</template>
```

### Nested Stores

You can nest providers to create hierarchical store structures. Each nested provider creates its own store instance:

```vue
<!-- ParentPage.vue -->
<script setup lang="ts">
import { WorkspaceProvider } from '../livestore/workspaces/store'
import Workspace from './Workspace.vue'
</script>

<template>
  <WorkspaceProvider storeId="workspace-1">
    <Workspace />
    <template #loading>Loading workspace...</template>
  </WorkspaceProvider>
</template>
```

```vue
<!-- Workspace.vue -->
<script setup lang="ts">
import { queryDb } from '@livestore/livestore'
import { useWorkspaceStore, tables as workspaceTables } from '../livestore/workspaces/store'
import { ProjectProvider } from '../livestore/projects/store'

const workspaceStore = await useWorkspaceStore()
const workspaces = workspaceStore.useQuery(queryDb(workspaceTables.workspaces.select()))
</script>

<template>
  <!-- Create a separate project store for each workspace -->
  <ProjectProvider
    v-for="workspace in workspaces"
    :key="workspace.id"
    :storeId="`project-${workspace.id}`"
  >
    <ProjectList />
    <template #loading>Loading project...</template>
  </ProjectProvider>
</template>
```

### Playground Examples

The [playground](https://github.com/slashv/vue-livestore/tree/main/playground) includes several examples demonstrating multi-store patterns:

- **[MultipleStoresPage.vue](playground/src/pages/MultipleStoresPage.vue)** - Two independent todo stores side-by-side
- **[NestedStoresPage.vue](playground/src/pages/NestedStoresPage.vue)** - Hierarchical workspace → projects → issues store structure
- **[MultipleStoresSuspensePage.vue](playground/src/pages/MultipleStoresSuspensePage.vue)** - Multiple stores with Suspense loading states

## TODO
- [x] Multiple stores support
- [x] useClientDocument composable
- [ ] Nuxt integration (might be separate repo or just example implementation)