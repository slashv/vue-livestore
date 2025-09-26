# React Multi-Store Implementation Reference

This document contains the complete multi-store implementation from the React LiveStore PR #585.

## Core Implementation

### packages/@livestore/react/src/multi-store/createStoreContext.tsx

```ts
import type { LiveStoreSchema } from '@livestore/common/schema'
import type { FC, ReactNode } from 'react'
import React, { useContext, useEffect, useRef } from 'react'
import { LiveStoreProvider } from '../LiveStoreProvider.js'
import { useStore as useStoreOriginal } from '../useStore.js'
import type {
  ComputeProviderProps,
  CreateStoreContextConfig,
  CreateStoreContextReturn,
  StoreWithReactAPI,
  UseStoreOptions,
} from './types.js'

// ============================================
// Main Implementation
// ============================================

export function createStoreContext<
  TSchema extends LiveStoreSchema,
  const TConfig extends CreateStoreContextConfig<TSchema>,
>(config: TConfig): CreateStoreContextReturn<TSchema, TConfig> {
  // Create a context for multi-instance registry
  const RegistryContext = React.createContext<Map<string, StoreWithReactAPI<TSchema>> | undefined>(undefined)
  RegistryContext.displayName = `${config.name}RegistryContext`

  // ============================================
  // Provider Component
  // ============================================

  const Provider: FC<ComputeProviderProps<TConfig>> = (props) => {
    // Registry for multi-instance support
    const registryRef = useRef<Map<string, StoreWithReactAPI<TSchema>>>(new Map())

    // Merge config with props - props take precedence
    const mergedProps = {
      ...config,
      ...props,
      // Ensure required values from either config or props
      schema: config.schema, // Schema always from config
      adapter: (props as any).adapter ?? config.adapter,
      batchUpdates: (props as any).batchUpdates ?? config.batchUpdates,
      storeId: (props as any).storeId ?? config.storeId ?? config.name,
    }

    // Validate required props at runtime (development only)
    if (process.env.NODE_ENV !== 'production') {
      if (!mergedProps.adapter) {
        throw new Error(
          `${config.name} Provider: adapter is required. Provide it either in createStoreContext or as a prop to the Provider.`,
        )
      }
      if (!mergedProps.batchUpdates) {
        throw new Error(
          `${config.name} Provider: batchUpdates is required. Provide it either in createStoreContext or as a prop to the Provider.`,
        )
      }
    }

    // Create a wrapper component that uses LiveStoreProvider
    return (
      <RegistryContext.Provider value={registryRef.current}>
        <LiveStoreProvider
          schema={mergedProps.schema}
          adapter={mergedProps.adapter}
          batchUpdates={mergedProps.batchUpdates}
          storeId={mergedProps.storeId}
          disableDevtools={mergedProps.disableDevtools}
          confirmUnsavedChanges={mergedProps.confirmUnsavedChanges}
          syncPayload={mergedProps.syncPayload}
          renderLoading={() => null} // Always render children for Suspense
          renderError={(error) => {
            throw error
          }} // Throw for Error Boundaries
          renderShutdown={() => null}
        >
          <StoreRegistrar storeId={mergedProps.storeId} registry={registryRef.current}>
            {props.children}
          </StoreRegistrar>
        </LiveStoreProvider>
      </RegistryContext.Provider>
    )
  }

  // Helper component to register store in the registry
  const StoreRegistrar: FC<{
    children: ReactNode
    storeId: string
    registry: Map<string, StoreWithReactAPI<TSchema>>
  }> = ({ children, storeId, registry }) => {
    const { store } = useStoreOriginal() as { store: StoreWithReactAPI<TSchema> }

    // Register this store instance
    useEffect(() => {
      registry.set(storeId, store)
      return () => {
        registry.delete(storeId)
      }
    }, [storeId, store, registry])

    return <>{children}</>
  }

  Provider.displayName = `${config.name}StoreProvider`

  // ============================================
  // useStore Hook
  // ============================================

  const useStore = (options?: UseStoreOptions): StoreWithReactAPI<TSchema> => {
    const registry = useContext(RegistryContext)

    // Always call the hook (React hooks rules)
    const storeResult = useStoreOriginal()

    // Multi-instance access via storeId
    if (options?.storeId) {
      if (!registry) {
        throw new Error(
          `Multi-instance access requires the store to be created with createStoreContext. ` +
            `Cannot access store with storeId="${options.storeId}".`,
        )
      }

      const targetStoreId = options.storeId // Capture it for closure
      const store = registry.get(targetStoreId)
      if (!store) {
        // Store might still be loading - throw a promise for Suspense
        throw new Promise<void>((resolve) => {
          // Check periodically if the store is available
          const checkInterval = setInterval(() => {
            if (registry.get(targetStoreId)) {
              clearInterval(checkInterval)
              resolve()
            }
          }, 10)

          // Timeout after 5 seconds
          setTimeout(() => {
            clearInterval(checkInterval)
            throw new Error(
              `Store instance "${targetStoreId}" not found after timeout. ` +
                `Make sure a ${config.name} Provider with storeId="${targetStoreId}" exists.`,
            )
          }, 5000)
        })
      }

      return store
    }

    // Default: use the standard store from the hook we already called
    if (!storeResult) {
      throw new Error(
        `useStore: must be used within a ${config.name} Provider. ` +
          `Wrap your component tree with <${config.name}Provider> to provide the store context.`,
      )
    }

    const { store } = storeResult as { store: StoreWithReactAPI<TSchema> }
    return store
  }

  // Return the tuple
  return [Provider, useStore]
}
```

## Type Definitions

### packages/@livestore/react/src/multi-store/types.ts

```ts
import type { Adapter } from '@livestore/common'
import type { LiveStoreSchema } from '@livestore/common/schema'
import type { Store } from '@livestore/livestore'
import type { Schema } from '@livestore/utils/effect'
import type { FC, ReactNode } from 'react'

// ============================================
// Core Types
// ============================================

// Configuration that can be provided to createStoreContext
export interface CreateStoreContextConfig<TSchema extends LiveStoreSchema> {
  name: string
  schema: TSchema
  adapter?: Adapter
  storeId?: string
  batchUpdates?: (fn: () => void) => void
  disableDevtools?: boolean
  confirmUnsavedChanges?: boolean
  syncPayload?: Schema.JsonValue
  // TODO: Add otelOptions when needed
}

// All possible Provider props
export interface BaseProviderProps {
  children: ReactNode
  storeId?: string
  adapter?: Adapter
  batchUpdates?: (fn: () => void) => void
  disableDevtools?: boolean
  confirmUnsavedChanges?: boolean
  syncPayload?: Schema.JsonValue
}

// ============================================
// Type-Level Computation (Simplified)
// ============================================

// Define props that can be configured either at createStoreContext or Provider level
type ConfigurableProps = {
  adapter: Adapter
  batchUpdates: (fn: () => void) => void
  storeId: string
}

// Helper to extract props from config that have non-undefined values
type ProvidedConfigProps<T> = {
  [K in keyof T as T[K] extends undefined ? never : K]: T[K]
}

// Compute which Provider props are required based on what was provided in config
// Props in config become optional (can override), props not in config are required
export type ComputeProviderProps<TConfig extends CreateStoreContextConfig<any>> = {
  children: ReactNode
  disableDevtools?: boolean
  confirmUnsavedChanges?: boolean
  syncPayload?: Schema.JsonValue
} & Omit<Required<ConfigurableProps>, keyof ProvidedConfigProps<TConfig>> &
  Partial<Pick<ConfigurableProps, keyof ProvidedConfigProps<TConfig> & keyof ConfigurableProps>>

// ============================================
// Store API Types
// ============================================

// React-specific methods added to the store
export type StoreReactAPI<_TSchema extends LiveStoreSchema> = {}

// Store with React API methods
export type StoreWithReactAPI<TSchema extends LiveStoreSchema> = Store<TSchema> & StoreReactAPI<TSchema>

// Options for useStore hook
export interface UseStoreOptions {
  storeId?: string
  syncPayload?: Schema.JsonValue
}

// ============================================
// Main Function Return Type
// ============================================

export type CreateStoreContextReturn<
  TSchema extends LiveStoreSchema,
  TConfig extends CreateStoreContextConfig<TSchema>,
> = [
  // Provider component with computed props
  FC<ComputeProviderProps<TConfig>>,
  // useStore hook
  (options?: UseStoreOptions) => StoreWithReactAPI<TSchema>,
]

// ============================================
// Main Function
// ============================================

// The actual implementation is in createStoreContext.tsx
// Import from there to use the function
```

## Exports

### packages/@livestore/react/src/multi-store/index.ts

```ts
// Multi-store API exports
export { createStoreContext } from './createStoreContext.js'
export type {
  ComputeProviderProps,
  CreateStoreContextConfig,
  CreateStoreContextReturn,
  StoreWithReactAPI,
  UseStoreOptions,
} from './types.js'
```

## Example Usage

### packages/@livestore/react/src/multi-store/example.tsx

```ts
// Example usage of the multi-store API showing type safety
// This file demonstrates the type-safe API but is not meant to be imported

import type { Adapter } from '@livestore/common'
import type { LiveStoreSchema } from '@livestore/common/schema'
import React from 'react'
import { unstable_batchedUpdates } from 'react-dom'
import { createStoreContext } from './types.js'

// Mock schemas for demonstration (actual schemas would be created with makeSchema)
// These are just for showing the type-safe API, not actual implementations
declare const workspaceSchema: LiveStoreSchema
declare const projectSchema: LiveStoreSchema
declare const issueSchema: LiveStoreSchema

// Example adapters
const workspaceAdapter: Adapter = {} as any
const projectAdapter: Adapter = {} as any
const issueAdapter: Adapter = {} as any

// ============================================
// Example 1: Minimal Configuration
// ============================================
// Only schema and name provided - adapter and batchUpdates required at Provider
const minimalContext = createStoreContext({
  name: 'minimal',
  schema: workspaceSchema,
})
const MinimalProvider = minimalContext[0]
const useMinimalStore = minimalContext[1]

// TypeScript enforces required props
function _MinimalExample() {
  return (
    <MinimalProvider
      storeId="workspace-1" //  Required - TS error if missing (not provided in config)
      adapter={workspaceAdapter} //  Required - TS error if missing
      batchUpdates={unstable_batchedUpdates} //  Required - TS error if missing
    >
      <MinimalContent />
    </MinimalProvider>
  )
}

// This would cause a TypeScript error:
// function InvalidMinimal() {
//   return (
//     <MinimalProvider>  // L TS Error: Missing required props
//       <div />
//     </MinimalProvider>
//   )
// }

// ============================================
// Example 2: Full Configuration
// ============================================
// Everything provided upfront - nothing required at Provider
const fullContext = createStoreContext({
  name: 'full',
  schema: projectSchema,
  adapter: projectAdapter,
  batchUpdates: unstable_batchedUpdates,
  storeId: 'main-project',
  disableDevtools: false,
})
const FullProvider = fullContext[0]
const useFullStore = fullContext[1]

// Only children required
function _FullExample() {
  return (
    <FullProvider>
      {' '}
      {/* //  Valid - all requirements satisfied */}
      <FullContent />
    </FullProvider>
  )
}

// Can still override config values
function _FullWithOverrides() {
  return (
    <FullProvider
      storeId="other-project" //  Optional override
      adapter={projectAdapter} //  Optional override
      disableDevtools={true} //  Optional override
    >
      <FullContent />
    </FullProvider>
  )
}

// ============================================
// Example 3: Partial Configuration (without storeId)
// ============================================
// Adapter provided, batchUpdates and storeId not provided
const partialContext = createStoreContext({
  name: 'partial',
  schema: issueSchema,
  adapter: issueAdapter, // Provided here
  // storeId not provided - will be required at Provider
})
const PartialProvider = partialContext[0]
const usePartialStore = partialContext[1]

// ============================================
// Example 3b: Partial Configuration (with storeId)
// ============================================
// Adapter and storeId provided, batchUpdates not provided
const partialWithIdContext = createStoreContext({
  name: 'partialWithId',
  schema: issueSchema,
  adapter: issueAdapter,
  storeId: 'default-issue', // Provided here
})
const PartialWithIdProvider = partialWithIdContext[0]
const _usePartialWithIdStore = partialWithIdContext[1]

// Both batchUpdates and storeId required (storeId not provided in config)
function _PartialExample() {
  return (
    <PartialProvider
      storeId="custom-issue" //  Required - TS error if missing (not provided in config)
      batchUpdates={unstable_batchedUpdates} //  Required
    >
      <PartialContent />
    </PartialProvider>
  )
}

// Only batchUpdates required (storeId provided in config)
function _PartialWithIdExample() {
  return (
    <PartialWithIdProvider
      batchUpdates={unstable_batchedUpdates} //  Required
      // storeId is optional - defaults to 'default-issue' from config
    >
      <PartialContent />
    </PartialWithIdProvider>
  )
}

// Can still override the storeId from config
function _PartialWithIdOverrideExample() {
  return (
    <PartialWithIdProvider
      batchUpdates={unstable_batchedUpdates} //  Required
      storeId="override-issue" //  Optional - overrides config value
    >
      <PartialContent />
    </PartialWithIdProvider>
  )
}

// ============================================
// Example 4: Using the Stores
// ============================================
function MinimalContent() {
  const _store = useMinimalStore()
  // store is fully typed with workspaceSchema

  // Can also access specific instances
  const _specificStore = useMinimalStore({ storeId: 'workspace-123' })

  return <div>Workspace Store</div>
}

function FullContent() {
  const _store = useFullStore()
  // store is fully typed with projectSchema

  // Future: will have React-specific methods
  // const tasks = store.useQuery(tasksQuery)

  return <div>Project Store</div>
}

function PartialContent() {
  const _store = usePartialStore()
  // store is fully typed with issueSchema

  return <div>Issue Store</div>
}

// ============================================
// Example 5: Multiple Instances
// ============================================
function _MultipleIssues({ issueIds }: { issueIds: string[] }) {
  // Note: In practice, you'd wrap each component with its own provider
  // This is just demonstrating the pattern
  return (
    <React.Suspense fallback={<div>Loading...</div>}>
      {issueIds.map((id) => (
        <PartialProvider key={id} storeId={`issue-${id}`} batchUpdates={unstable_batchedUpdates}>
          <IssueView issueId={id} />
        </PartialProvider>
      ))}
    </React.Suspense>
  )
}

function IssueView({ issueId }: { issueId: string }) {
  // Access specific instance
  const _store = usePartialStore({ storeId: `issue-${issueId}` })

  return <div>Issue {issueId}</div>
}

// ============================================
// Example 6: Nested Stores
// ============================================
function _App() {
  return (
    // Workspace store with full config
    <FullProvider>
      <React.Suspense fallback={<div>Loading workspace...</div>}>
        <WorkspaceView />
      </React.Suspense>
    </FullProvider>
  )
}

function WorkspaceView() {
  const _workspaceStore = useFullStore()
  // Use workspace data to determine project ID
  const projectId = 'project-from-workspace'

  return (
    // Project store nested inside workspace
    <PartialProvider storeId={projectId} batchUpdates={unstable_batchedUpdates}>
      <React.Suspense fallback={<div>Loading project...</div>}>
        <ProjectView />
      </React.Suspense>
    </PartialProvider>
  )
}

function ProjectView() {
  const _projectStore = usePartialStore()

  return <div>Project content</div>
}

// This file demonstrates type-safe patterns but is not meant to be imported
```

## Test Implementation

### packages/@livestore/react/src/multi-store/test-implementation.tsx

```ts
// Test file to verify the createStoreContext implementation works

import { makeInMemoryAdapter } from '@livestore/adapter-web'
import { Events, makeSchema, State } from '@livestore/common/schema'
import { Schema } from '@livestore/utils/effect'
import { Suspense } from 'react'
import { unstable_batchedUpdates } from 'react-dom'
import { createStoreContext } from './createStoreContext.js'

// ============================================
// Create a test schema
// ============================================

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

const state = State.SQLite.makeState({ tables: { todos }, materializers: {} })
const todoSchema = makeSchema({ state, events })

// ============================================
// Test 1: Minimal configuration (all required at Provider)
// ============================================

const [MinimalProvider, useMinimalStore] = createStoreContext({
  name: 'minimal',
  schema: todoSchema,
})

function TestMinimal() {
  return (
    <MinimalProvider storeId="test-minimal" adapter={makeInMemoryAdapter()} batchUpdates={unstable_batchedUpdates}>
      <Suspense fallback={<div>Loading...</div>}>
        <MinimalContent />
      </Suspense>
    </MinimalProvider>
  )
}

function MinimalContent() {
  const store = useMinimalStore()
  console.log('Minimal store loaded:', store.storeId)
  return <div>Store ID: {store.storeId}</div>
}

// ============================================
// Test 2: Full configuration (nothing required at Provider)
// ============================================

const [FullProvider, useFullStore] = createStoreContext({
  name: 'full',
  schema: todoSchema,
  adapter: makeInMemoryAdapter(),
  batchUpdates: unstable_batchedUpdates,
  storeId: 'full-default',
})

function TestFull() {
  return (
    <FullProvider>
      <Suspense fallback={<div>Loading...</div>}>
        <FullContent />
      </Suspense>
    </FullProvider>
  )
}

function FullContent() {
  const store = useFullStore()
  console.log('Full store loaded:', store.storeId)
  return <div>Store ID: {store.storeId}</div>
}

// ============================================
// Test 3: Multiple instances
// ============================================

const [MultiProvider, useMultiStore] = createStoreContext({
  name: 'multi',
  schema: todoSchema,
  adapter: makeInMemoryAdapter(),
  batchUpdates: unstable_batchedUpdates,
})

function TestMultiInstance() {
  return (
    <>
      <MultiProvider storeId="instance-1">
        <Suspense fallback={<div>Loading instance 1...</div>}>
          <InstanceContent instanceId="instance-1" />
        </Suspense>
      </MultiProvider>

      <MultiProvider storeId="instance-2">
        <Suspense fallback={<div>Loading instance 2...</div>}>
          <InstanceContent instanceId="instance-2" />
        </Suspense>
      </MultiProvider>
    </>
  )
}

function InstanceContent({ instanceId }: { instanceId: string }) {
  // Access specific instance
  const store = useMultiStore({ storeId: instanceId })
  console.log(`Instance ${instanceId} loaded:`, store.storeId)
  return <div>Instance: {store.storeId}</div>
}

// ============================================
// Test 4: Nested stores
// ============================================

const [ParentProvider, useParentStore] = createStoreContext({
  name: 'parent',
  schema: todoSchema,
  adapter: makeInMemoryAdapter(),
  batchUpdates: unstable_batchedUpdates,
  storeId: 'parent-store',
})

const [ChildProvider, useChildStore] = createStoreContext({
  name: 'child',
  schema: todoSchema,
  adapter: makeInMemoryAdapter(),
  batchUpdates: unstable_batchedUpdates,
})

function TestNested() {
  return (
    <ParentProvider>
      <Suspense fallback={<div>Loading parent...</div>}>
        <ParentContent />
      </Suspense>
    </ParentProvider>
  )
}

function ParentContent() {
  const parentStore = useParentStore()
  console.log('Parent store loaded:', parentStore.storeId)

  return (
    <ChildProvider storeId={`child-of-${parentStore.storeId}`}>
      <Suspense fallback={<div>Loading child...</div>}>
        <ChildContent />
      </Suspense>
    </ChildProvider>
  )
}

function ChildContent() {
  const parentStore = useParentStore()
  const childStore = useChildStore()
  console.log('Parent:', parentStore.storeId, 'Child:', childStore.storeId)

  return (
    <div>
      Parent: {parentStore.storeId}
      <br />
      Child: {childStore.storeId}
    </div>
  )
}

// ============================================
// Export test app
// ============================================

export function TestApp() {
  return (
    <div>
      <h2>Test 1: Minimal Configuration</h2>
      <TestMinimal />

      <h2>Test 2: Full Configuration</h2>
      <TestFull />

      <h2>Test 3: Multiple Instances</h2>
      <TestMultiInstance />

      <h2>Test 4: Nested Stores</h2>
      <TestNested />
    </div>
  )
}
```

## Key Features

1. **Tuple Pattern**: `createStoreContext` returns `[Provider, useStore]` for cleaner API
2. **Type-Safe Props**: TypeScript enforces required vs optional props based on config
3. **Multi-Instance Support**: Access specific store instances via `storeId` option
4. **Suspense Integration**: Children render immediately, stores load in background
5. **Registry Pattern**: Internal registry tracks multiple store instances
6. **Flexible Configuration**: Props can be provided at context creation or Provider level

## Usage Patterns

### Single Store
```ts
const [Provider, useStore] = createStoreContext({
  name: 'app',
  schema: appSchema,
  adapter: appAdapter,
  batchUpdates,
})

// In component
const store = useStore()
```

### Multiple Instances
```ts
const store1 = useStore({ storeId: 'instance-1' })
const store2 = useStore({ storeId: 'instance-2' })
```

### Nested Stores
```ts
function Parent() {
  const parentStore = useParentStore()
  return (
    <ChildProvider storeId={`child-of-${parentStore.storeId}`}>
      <Child />
    </ChildProvider>
  )
}
```