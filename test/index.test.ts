import { describe, it, expect } from 'vitest'
import { makeInMemoryAdapter, } from '@livestore/adapter-web'
import { State, Events, Schema, makeSchema, queryDb } from '@livestore/livestore'
import { mount } from '@vue/test-utils'
import { LiveStoreProvider } from '../src/provider'
import { useStore, useQuery } from '../src'
import { defineComponent, h, nextTick, Suspense } from 'vue'

const scheduler = typeof setImmediate === 'function' ? setImmediate : setTimeout
function flushPromises() {
  return new Promise<void>((resolve) => {
    scheduler(resolve)
  })
}

export type Todo = {
  id: string
  text: string
  completed: boolean
}

const createStoreSchema = () => {
  const todos = State.SQLite.table({
    name: 'todos',
    columns: {
      id: State.SQLite.text({ primaryKey: true }),
      text: State.SQLite.text({ default: '', nullable: false }),
      completed: State.SQLite.boolean({ default: false, nullable: false }),
    },
  })
  const events = {
    todoCreated: Events.synced({
      name: 'todoCreated',
      schema: Schema.Struct({ id: Schema.String, text: Schema.String, completed: Schema.Boolean }),
    }),
    todoUpdated: Events.synced({
      name: 'todoUpdated',
      schema: Schema.Struct({
        id: Schema.String,
        text: Schema.String.pipe(Schema.optional),
        completed: Schema.Boolean.pipe(Schema.optional),
      }),
    }),
  }
  const materializers = State.SQLite.materializers(events, {
    todoCreated: ({ id, text, completed }) => todos.insert({ id, text, completed }),
    todoUpdated: ({ id, text, completed }) => todos.update({ completed, text }).where({ id }),
  })
  const tables = { todos }
  const state = State.SQLite.makeState({ tables, materializers })
  return { schema: makeSchema({ state, events }), events, tables }
}

describe('LiveStore Integration', () => {
  it('Loads the store via provider and queries are reactive', async () => {
    const { schema, events, tables } = createStoreSchema()
    const storeOptions = { schema, adapter: makeInMemoryAdapter(), storeId: 'test-store' }

    // Create a query
    const todosQuery = queryDb(() => tables.todos.select())

    // Define a test component that uses our hooks
    const TestComponent = defineComponent({
      setup() {
        const { store } = useStore()
        const todos = useQuery(todosQuery)

        return { store, todos }
      },
      render() {
        return h('div', {}, [
          h('span', { id: 'count' }, this.todos.length.toString()),
          h('ul', {}, this.todos.map(todo =>
            h('li', { key: todo.id }, `${todo.text} - ${todo.completed ? 'Done' : 'Pending'}`)
          ))
        ])
      }
    })

    // Create wrapper component to provide store context
    const WrapperComponent = defineComponent({
      components: {
        LiveStoreProvider,
        TestComponent
      },
      setup() {
        return () =>
          h(Suspense, {}, {
            default: () =>
              h(LiveStoreProvider, { options: storeOptions }, { default: () => h(TestComponent) }),
            fallback: () => h('div', {}, 'loading'),
          })
      }
    })

    const wrapper = mount(WrapperComponent)
    await flushPromises()
    await nextTick()

    // Find the test component
    const testComponent = wrapper.findComponent(TestComponent)
    expect(testComponent.exists()).toBe(true)

    // Initial state - should have no todos
    expect(testComponent.vm.todos).toHaveLength(0)
    expect(testComponent.find('#count').text()).toBe('0')

    // Create a todo
    const storeFromComponent = testComponent.vm.store
    if (!storeFromComponent) throw new Error('Store is undefined')

    storeFromComponent.commit(events.todoCreated({
      id: 'todo-1',
      text: 'Test Todo',
      completed: false
    }))

    // Wait for reactive updates
    await nextTick()

    // Should have one todo now
    expect(testComponent.vm.todos).toHaveLength(1)
    expect(testComponent.find('#count').text()).toBe('1')
    expect(testComponent.find('li').text()).toContain('Test Todo')
    expect(testComponent.find('li').text()).toContain('Pending')

    // Update the todo
    storeFromComponent.commit(events.todoUpdated({
      id: 'todo-1',
      completed: true
    }))

    // Wait for reactive updates
    await nextTick()

    // Todo should be marked as completed
    expect(testComponent.vm.todos).toHaveLength(1)
    expect(testComponent.find('li').text()).toContain('Done')
  })
})
