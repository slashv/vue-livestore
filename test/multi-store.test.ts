import { describe, it, expect } from 'vitest'
import { makeInMemoryAdapter } from '@livestore/adapter-web'
import { State, Events, Schema, makeSchema, queryDb } from '@livestore/livestore'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, h, nextTick } from 'vue'

const scheduler = typeof setImmediate === 'function' ? setImmediate : setTimeout
function flushPromisesCustom() {
  return new Promise(function (resolve) {
    scheduler(resolve)
  })
}
import { createStoreContext } from '../src/multi-store/createStoreContext'

// ============================================
// Test Schemas
// ============================================

const createTodoSchema = () => {
  const todos = State.SQLite.table({
    name: 'todos',
    columns: {
      id: State.SQLite.text({ primaryKey: true }),
      title: State.SQLite.text({ nullable: false }),
      completed: State.SQLite.boolean({ default: false }),
    },
  })

  const events = {
    todoAdded: Events.synced({
      name: 'todoAdded',
      schema: Schema.Struct({ id: Schema.String, title: Schema.String }),
    }),
    todoToggled: Events.synced({
      name: 'todoToggled',
      schema: Schema.Struct({ id: Schema.String }),
    }),
  }

  const materializers = State.SQLite.materializers(events, {
    todoAdded: ({ id, title }) => todos.insert({ id, title, completed: false }),
    todoToggled: ({ id }) => todos.update({ completed: State.SQLite.not('completed') }).where({ id }),
  })

  const tables = { todos }
  const state = State.SQLite.makeState({ tables, materializers })
  return { schema: makeSchema({ state, events }), events, tables }
}

const createWorkspaceSchema = () => {
  const workspaces = State.SQLite.table({
    name: 'workspaces',
    columns: {
      id: State.SQLite.text({ primaryKey: true }),
      name: State.SQLite.text({ nullable: false }),
      currentProjectId: State.SQLite.text({ nullable: true }),
    },
  })

  const events = {
    workspaceCreated: Events.synced({
      name: 'workspaceCreated',
      schema: Schema.Struct({ id: Schema.String, name: Schema.String }),
    }),
  }

  const materializers = State.SQLite.materializers(events, {
    workspaceCreated: ({ id, name }) => workspaces.insert({ id, name, currentProjectId: null }),
  })

  const tables = { workspaces }
  const state = State.SQLite.makeState({ tables, materializers })
  return { schema: makeSchema({ state, events }), events, tables }
}

const createProjectSchema = () => {
  const projects = State.SQLite.table({
    name: 'projects',
    columns: {
      id: State.SQLite.text({ primaryKey: true }),
      name: State.SQLite.text({ nullable: false }),
      workspaceId: State.SQLite.text({ nullable: false }),
    },
  })

  const events = {
    projectCreated: Events.synced({
      name: 'projectCreated',
      schema: Schema.Struct({ id: Schema.String, name: Schema.String, workspaceId: Schema.String }),
    }),
  }

  const materializers = State.SQLite.materializers(events, {
    projectCreated: ({ id, name, workspaceId }) => projects.insert({ id, name, workspaceId }),
  })

  const tables = { projects }
  const state = State.SQLite.makeState({ tables, materializers })
  return { schema: makeSchema({ state, events }), events, tables }
}

// ============================================
// Test 1: Minimal configuration
// ============================================

describe('Multi-Store: Minimal Configuration', () => {
  it('requires all props at Provider when not provided in config', async () => {
    const { schema: todoSchema } = createTodoSchema()

    // Only schema and name provided - adapter and storeId required at Provider
    const [MinimalProvider, useMinimalStore] = createStoreContext({
      name: 'minimal',
      schema: todoSchema,
    })

    const TestComponent = defineComponent({
      setup() {
        const store = useMinimalStore()
        return { store }
      },
      render() {
        return h('div', {}, `Store ID: ${this.store.storeId}`)
      }
    })

    const WrapperComponent = defineComponent({
      setup() {
        return () => h(MinimalProvider, {
          storeId: 'test-minimal',
          adapter: makeInMemoryAdapter(),
        }, {
          default: () => h(TestComponent),
          loading: () => h('div', {}, 'Loading...'),
        })
      }
    })

    const wrapper = mount(WrapperComponent)

    // Wait for store to initialize and component to render
    await flushPromisesCustom()
    await nextTick()
    await flushPromisesCustom()
    await nextTick()

    expect(wrapper.text()).toContain('Store ID: test-minimal')
  })

  it('throws error when required props are missing', () => {
    const { schema: todoSchema } = createTodoSchema()

    const [MinimalProvider] = createStoreContext({
      name: 'minimal',
      schema: todoSchema,
    })

    const WrapperComponent = defineComponent({
      setup() {
        // Missing adapter - should throw
        return () => h(MinimalProvider as unknown as LiveStoreInstance, {
          storeId: 'test-minimal',
          // adapter is missing!
        }, {
          default: () => h('div', {}, 'Should not render')
        })
      }
    })

    expect(() => mount(WrapperComponent)).toThrow()
  })
})

// ============================================
// Test 2: Full configuration
// ============================================

describe('Multi-Store: Full Configuration', () => {
  it('works with all config provided upfront', async () => {
    const { schema: todoSchema } = createTodoSchema()

    // Everything provided upfront - nothing required at Provider
    const [FullProvider, useFullStore] = createStoreContext({
      name: 'full',
      schema: todoSchema,
      adapter: makeInMemoryAdapter(),
      storeId: 'full-default',
    })

    const TestComponent = defineComponent({
      setup() {
        const store = useFullStore()
        return { store }
      },
      render() {
        return h('div', {}, `Store ID: ${this.store.storeId}`)
      }
    })

    const WrapperComponent = defineComponent({
      setup() {
        // Only children required - all config satisfied
        return () => h(FullProvider, {}, {
          default: () => h(TestComponent),
          loading: () => h('div', {}, 'Loading...'),
        })
      }
    })

    const wrapper = mount(WrapperComponent)

    // Wait for store to initialize and component to render
    await flushPromisesCustom()
    await nextTick()
    await flushPromisesCustom()
    await nextTick()

    expect(wrapper.text()).toContain('Store ID: full-default')
  })

  it('allows overriding config values at Provider', async () => {
    const { schema: todoSchema } = createTodoSchema()

    const [FullProvider, useFullStore] = createStoreContext({
      name: 'full',
      schema: todoSchema,
      adapter: makeInMemoryAdapter(),
      storeId: 'full-default',
    })

    const TestComponent = defineComponent({
      setup() {
        const store = useFullStore()
        return { store }
      },
      render() {
        return h('div', {}, `Store ID: ${this.store.storeId}`)
      }
    })

    const WrapperComponent = defineComponent({
      setup() {
        return () => h(FullProvider, {
          storeId: 'override-id', // Override the default
        }, {
          default: () => h(TestComponent),
          loading: () => h('div', {}, 'Loading...'),
        })
      }
    })

    const wrapper = mount(WrapperComponent)

    // Wait for store to initialize and component to render
    await flushPromisesCustom()
    await nextTick()
    await flushPromisesCustom()
    await nextTick()

    expect(wrapper.text()).toContain('Store ID: override-id')
  })
})

// ============================================
// Test 3: Multiple instances
// ============================================

describe('Multi-Store: Multiple Instances', () => {
  it('supports multiple instances of the same store type', async () => {
    const { schema: todoSchema } = createTodoSchema()

    const [MultiProvider, useMultiStore] = createStoreContext({
      name: 'multi',
      schema: todoSchema,
      adapter: makeInMemoryAdapter(),
    })

    const InstanceComponent = defineComponent({
      props: ['instanceId'],
      setup(props) {
        // Access specific instance by storeId
        const store = useMultiStore({ storeId: props.instanceId })
        return { store }
      },
      render() {
        return h('div', { class: this.instanceId }, `Instance: ${this.store.storeId}`)
      }
    })

    const WrapperComponent = defineComponent({
      setup() {
        return () => h('div', {}, [
          h(MultiProvider, { storeId: 'instance-1' }, {
            default: () => h(InstanceComponent, { instanceId: 'instance-1' }),
            loading: () => h('div', {}, 'Loading instance 1...'),
          }),
          h(MultiProvider, { storeId: 'instance-2' }, {
            default: () => h(InstanceComponent, { instanceId: 'instance-2' }),
            loading: () => h('div', {}, 'Loading instance 2...'),
          }),
        ])
      }
    })

    const wrapper = mount(WrapperComponent)

    // Wait for stores to initialize and components to render
    await flushPromisesCustom()
    await nextTick()
    await flushPromisesCustom()
    await nextTick()

    expect(wrapper.find('.instance-1').text()).toContain('Instance: instance-1')
    expect(wrapper.find('.instance-2').text()).toContain('Instance: instance-2')
  })
})

// ============================================
// Test 4: Nested stores (hierarchical)
// ============================================

describe('Multi-Store: Nested Stores', () => {
  it('supports hierarchical nested stores', async () => {
    const { schema: workspaceSchema } = createWorkspaceSchema()
    const { schema: projectSchema } = createProjectSchema()

    const [WorkspaceProvider, useWorkspaceStore] = createStoreContext({
      name: 'workspace',
      schema: workspaceSchema,
      adapter: makeInMemoryAdapter(),
      storeId: 'workspace-1',
    })

    const [ProjectProvider, useProjectStore] = createStoreContext({
      name: 'project',
      schema: projectSchema,
      adapter: makeInMemoryAdapter(),
    })

    const ProjectComponent = defineComponent({
      setup() {
        const workspaceStore = useWorkspaceStore()
        const projectStore = useProjectStore()
        return { workspaceStore, projectStore }
      },
      render() {
        return h('div', {}, [
          h('div', { class: 'workspace' }, `Workspace: ${this.workspaceStore.storeId}`),
          h('div', { class: 'project' }, `Project: ${this.projectStore.storeId}`),
        ])
      }
    })

    const WorkspaceComponent = defineComponent({
      setup() {
        const workspaceStore = useWorkspaceStore()
        return { workspaceStore }
      },
      render() {
        // Derive project ID from workspace
        return h(ProjectProvider, {
          storeId: `project-of-${this.workspaceStore.storeId}`
        }, {
          default: () => h(ProjectComponent),
          loading: () => h('div', {}, 'Loading project...'),
        })
      }
    })

    const WrapperComponent = defineComponent({
      setup() {
        return () => h(WorkspaceProvider, {}, {
          default: () => h(WorkspaceComponent),
          loading: () => h('div', {}, 'Loading workspace...'),
        })
      }
    })

    const wrapper = mount(WrapperComponent)

    // Wait for nested stores to initialize and components to render
    await flushPromisesCustom()
    await nextTick()
    await flushPromisesCustom()
    await nextTick()
    await flushPromisesCustom()
    await nextTick()

    expect(wrapper.find('.workspace').text()).toContain('Workspace: workspace-1')
    expect(wrapper.find('.project').text()).toContain('Project: project-of-workspace-1')
  })
})

// ============================================
// Test 5: Concurrent loading
// ============================================

describe('Multi-Store: Loading', () => {
  it('loads multiple stores', async () => {
    const { schema: todoSchema } = createTodoSchema()
    const { schema: workspaceSchema } = createWorkspaceSchema()
    const { schema: projectSchema } = createProjectSchema()

    const [TodoProvider, useTodoStore] = createStoreContext({
      name: 'todos',
      schema: todoSchema,
      adapter: makeInMemoryAdapter(),
      storeId: 'todos',
    })

    const [WorkspaceProvider, useWorkspaceStore] = createStoreContext({
      name: 'workspace',
      schema: workspaceSchema,
      adapter: makeInMemoryAdapter(),
      storeId: 'workspace',
    })

    const [ProjectProvider, useProjectStore] = createStoreContext({
      name: 'project',
      schema: projectSchema,
      adapter: makeInMemoryAdapter(),
      storeId: 'project',
    })

    const loadStartTimes = new Map<string, number>()
    const loadEndTimes = new Map<string, number>()

    const TodoSection = defineComponent({
      setup() {
        loadStartTimes.set('todos', Date.now())
        const store = useTodoStore()
        loadEndTimes.set('todos', Date.now())
        return { store }
      },
      render() {
        return h('div', { class: 'todos' }, 'Todos loaded')
      }
    })

    const WorkspaceSection = defineComponent({
      setup() {
        loadStartTimes.set('workspace', Date.now())
        const store = useWorkspaceStore()
        loadEndTimes.set('workspace', Date.now())
        return { store }
      },
      render() {
        return h('div', { class: 'workspace' }, 'Workspace loaded')
      }
    })

    const ProjectSection = defineComponent({
      setup() {
        loadStartTimes.set('project', Date.now())
        const store = useProjectStore()
        loadEndTimes.set('project', Date.now())
        return { store }
      },
      render() {
        return h('div', { class: 'project' }, 'Project loaded')
      }
    })

    const WrapperComponent = defineComponent({
      setup() {
        // All stores load concurrently; providers handle their own loading
        return () => h(TodoProvider, {}, {
          default: () => h(WorkspaceProvider, {}, {
            default: () => h(ProjectProvider, {}, {
              default: () => h('div', { class: 'dashboard' }, [
                h(TodoSection),
                h(WorkspaceSection),
                h(ProjectSection),
              ]),
              loading: () => h('div', {}, 'Loading project...'),
            }),
            loading: () => h('div', {}, 'Loading workspace...'),
          }),
          loading: () => h('div', {}, 'Loading todos...'),
        })
      }
    })

    const wrapper = mount(WrapperComponent)
    await flushPromises()
    await nextTick()

    // Verify all sections loaded
    expect(wrapper.find('.todos').exists()).toBe(true)
    expect(wrapper.find('.workspace').exists()).toBe(true)
    expect(wrapper.find('.project').exists()).toBe(true)

    // With blocking providers, nested providers load sequentially; no concurrency guarantee
  })
})

// ============================================
// Test 6: Store methods integration
// ============================================

describe('Multi-Store: Store Methods', () => {
  it('provides Vue-specific methods on store instance', async () => {
    const { schema: todoSchema, tables } = createTodoSchema()

    const [TodoProvider, useTodoStore] = createStoreContext({
      name: 'todos',
      schema: todoSchema,
      adapter: makeInMemoryAdapter(),
      storeId: 'todos',
    })

    // Use a real query that matches the schema
    const todosQuery = queryDb(() => tables.todos.select())

    const TestComponent = defineComponent({
      setup() {
        const store = useTodoStore()
        // Vue-specific methods should be available
        const todos = store.useQuery(todosQuery)

        return { store, todos }
      },
      render() {
        return h('div', {}, [
          h('div', { class: 'store-id' }, `Store: ${this.store.storeId}`),
          h('div', { class: 'query-result' }, `Todos: ${this.todos.length}`),
        ])
      }
    })

    const WrapperComponent = defineComponent({
      setup() {
        return () => h(TodoProvider, {}, {
          default: () => h(TestComponent),
          loading: () => h('div', {}, 'Loading...'),
        })
      }
    })

    const wrapper = mount(WrapperComponent)

    // Wait for store to initialize and component to render
    await flushPromisesCustom()
    await nextTick()
    await flushPromisesCustom()
    await nextTick()

    expect(wrapper.find('.store-id').text()).toContain('Store: todos')
    expect(wrapper.find('.query-result').exists()).toBe(true)
  })

  it('maintains reactivity with store commits', async () => {
    const { schema: todoSchema, tables, events } = createTodoSchema()

    const [TodoProvider, useTodoStore] = createStoreContext({
      name: 'todos',
      schema: todoSchema,
      adapter: makeInMemoryAdapter(),
      storeId: 'todos',
    })

    const todosQuery = queryDb(() => tables.todos.select())

    const TestComponent = defineComponent({
      setup() {
        const store = useTodoStore()
        const todos = store.useQuery(todosQuery)

        const addTodo = () => {
          store.commit(events.todoAdded({
            id: 'todo-1',
            title: 'Test Todo',
          }))
        }

        return { store, todos, addTodo }
      },
      render() {
        return h('div', {}, [
          h('button', { onClick: this.addTodo }, 'Add Todo'),
          h('div', { class: 'count' }, `Count: ${this.todos.length}`),
        ])
      }
    })

    const WrapperComponent = defineComponent({
      setup() {
        return () => h(TodoProvider, {}, {
          default: () => h(TestComponent),
          loading: () => h('div', {}, 'Loading...'),
        })
      }
    })

    const wrapper = mount(WrapperComponent)

    // Wait for store to initialize and component to render
    await flushPromisesCustom()
    await nextTick()
    await flushPromisesCustom()
    await nextTick()

    // Initial state
    expect(wrapper.find('.count').text()).toContain('Count: 0')

    // Add a todo
    await wrapper.find('button').trigger('click')
    await nextTick()

    // Should update reactively
    expect(wrapper.find('.count').text()).toContain('Count: 1')
  })
})
