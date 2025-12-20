# Vue bindings for LiveStore

Vue LiveStore is in beta with intention to mature alongside [LiveStore](https://livestore.dev/). Happy to accept suggestions for improvement and contributions. See list of todos below for pending areas.

## Installation

It's strongly recommended to use `bun` or `pnpm` for the simplest and most reliable dependency setup (see [note on package management](https://docs.livestore.dev/misc/package-management/) for more details).

**Install LiveStore**
```bash
pnpm install @livestore/livestore @livestore/wa-sqlite @livestore/adapter-web @livestore/utils @livestore/peer-deps @livestore/devtools-vite
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
  <Suspense>
    <template #default>
      <LiveStoreProvider :options="storeOptions">
        <ToDos />
      </LiveStoreProvider>
    </template>
    <template #fallback>
      <div>Loading LiveStore...</div>
    </template>
  </Suspense>
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

## TODO
- [x] useClientDocument composable
- [ ] Multiple stores support
- [ ] Nuxt integration (might be separate repo or just example implementation)

## Comments
**Why not a Vue plugin instead of provider pattern?**
A Vue plugin would probably be more idiomatic to the Vue ecosystem but a provider has the benefit of easily designating a loading slot. It also matches better to the React implementation for LiveStore which makes generalising examples easier. It's possible as this package matures we might switch to a plugin structure if it makes sense. We would also see what the best option would be when integrating into Nuxt.