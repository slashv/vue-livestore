<script setup lang="ts">
import { ref } from 'vue'
import { makePersistedAdapter } from '@livestore/adapter-web'
import LiveStoreSharedWorker from '@livestore/adapter-web/shared-worker?sharedworker'
import LiveStoreWorker from '../livestore/livestore.worker?worker'
import { schema, events, tables } from '../livestore/schema'
import { userSchema, userEvents, userTables } from '../livestore/userSchema'
import { createStoreContext } from 'vue-livestore'
import { queryDb } from '@livestore/livestore'

const adapter = makePersistedAdapter({
  storage: { type: 'opfs' },
  worker: LiveStoreWorker,
  sharedWorker: LiveStoreSharedWorker,
})

const [UserStoreProvider, useUserStore] = createStoreContext({
  name: 'UserStore',
  schema: userSchema,
  adapter,
  storeId: 'nested-user-store',
})

const [TodoStoreProvider, useTodoStore] = createStoreContext({
  name: 'NestedTodoStore',
  schema,
  adapter,
})

const userStore = useUserStore()
const usersQuery = queryDb(userTables.users.orderBy([{ col: 'createdAt', direction: 'desc' }]), { label: 'users' })
const users = userStore.useQuery(usersQuery)

const currentUserId = ref((users.value && users.value.length > 0) ? users.value[0].id : 'user-1')

const createUser = () => {
  const id = `user-${Date.now()}`
  userStore.commit(userEvents.userCreated({
    id,
    name: `User ${Math.floor(Math.random() * 1000)}`,
    email: `user${Math.floor(Math.random() * 1000)}@example.com`,
    createdAt: new Date(),
  }))
  currentUserId.value = id
}

const getTodos = () => {
  const todoStore = useTodoStore()
  const todosQuery = queryDb(tables.todos.where({ deletedAt: null }), { label: 'todos' })
  return todoStore.useQuery(todosQuery)
}

const addTodo = () => {
  const todoStore = useTodoStore()
  todoStore.commit(events.todoCreated({
    id: Date.now().toString(),
    text: `Todo for user ${currentUserId.value}`,
  }))
}
</script>

<template>
  <UserStoreProvider>
    <template #loading>Loading users...</template>

    <div>
      <h3>Users</h3>
      <button @click="createUser">Create User</button>
      <select v-model="currentUserId">
        <option v-for="user in users" :key="user.id" :value="user.id">
          {{ user.name }} ({{ user.email }})
        </option>
      </select>
    </div>

    <TodoStoreProvider :storeId="currentUserId ? `todo-${currentUserId}` : 'default-todos'">
      <template #loading>Loading todos...</template>

      <div>
        <h4>Todos for {{ currentUserId }}</h4>
        <button @click="addTodo">Add Todo</button>
        <p>{{ getTodos().value.length }} todos</p>
        <ul>
          <li v-for="todo in getTodos().value" :key="todo.id">
            {{ todo.text }}
          </li>
        </ul>
      </div>
    </TodoStoreProvider>
  </UserStoreProvider>
</template>

