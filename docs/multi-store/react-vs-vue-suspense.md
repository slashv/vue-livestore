# React Suspense vs Vue Suspense: A Technical Comparison

## Overview

React and Vue both provide Suspense components for handling asynchronous operations, but they have fundamentally different implementations and usage patterns. Understanding these differences is critical when porting patterns from React to Vue, as code that works in React may not work in Vue without significant modifications.

This document explains the key differences and provides guidance for implementing Suspense-compatible patterns in both frameworks.

## Quick Reference

| Feature | React Suspense | Vue Suspense |
|---------|---------------|--------------|
| **Promise Handling** | Throws promises during render | Awaits promises in async setup |
| **Component Type** | Any component can suspend | Must have async setup() or `<script setup>` with top-level await |
| **Hook/Composable** | Can throw promises | Must return promises to be awaited |
| **Lifecycle** | Can suspend during render | Suspends only during setup phase |
| **State Preservation** | Lost on first suspend | Preserved after mount |
| **Error Handling** | Error boundaries | `errorCaptured` lifecycle hook |
| **Stability** | Stable (React 18+) | Experimental |

## Fundamental Differences

### 1. Promise Handling Mechanism

#### React: Throw-and-Catch Pattern

React Suspense works by **catching thrown promises** during the render phase. Components (or hooks) can throw promises synchronously, and React's rendering engine catches these and suspends the component tree.

```jsx
// React pattern
function Component() {
  const data = use(dataPromise)  // throws promise if pending
  return <div>{data}</div>
}

// Or manually throwing
function useData() {
  if (!ready) {
    throw dataPromise  // React catches this
  }
  return data
}
```

**How it works:**
1. Component starts rendering
2. Hook/function throws a promise
3. React's render phase catches the thrown promise
4. React suspends the component tree
5. Shows fallback UI
6. When promise resolves, React re-renders from scratch

#### Vue: Async-Await Pattern

Vue Suspense works with **async setup functions** that return promises. The setup function must be declared as async or use top-level await in `<script setup>`.

```vue
<!-- Vue pattern -->
<script setup>
// Top-level await makes setup async
const data = await fetchData()
</script>

<template>
  <div>{{ data }}</div>
</template>
```

**How it works:**
1. Component begins setup phase
2. Setup function is async and returns a promise
3. Vue detects the async setup
4. Vue suspends (shows fallback)
5. When promise resolves, setup completes
6. Component renders with resolved data

### 2. Component Lifecycle Integration

#### React: Render-Phase Suspension

- Suspension happens during the **render phase**
- Components can suspend multiple times during their lifecycle
- Can start rendering, throw promise, pause mid-render
- State is lost on first suspension before mount
- Concurrent rendering makes this seamless

```jsx
<Suspense fallback={<Loading />}>
  <Component />  {/* Can suspend during render */}
</Suspense>
```

#### Vue: Setup-Phase Suspension

- Suspension happens during the **setup phase** (before rendering)
- Setup must complete before rendering begins
- Once mounted, components cannot suspend again
- Component either completes async setup or shows fallback
- No mid-render suspension

```vue
<Suspense>
  <template #default>
    <Component />  <!-- Suspends during setup only -->
  </template>
  <template #fallback>
    <Loading />
  </template>
</Suspense>
```

### 3. Hook/Composable Behavior

#### React: Hooks Can Throw

React hooks can throw promises, which bubble up through the render tree to be caught by Suspense boundaries.

```jsx
// React hook that throws
function useStore() {
  const store = getStore()
  if (!store.ready) {
    throw store.readyPromise  // Suspense catches this
  }
  return store
}

// Usage
function Component() {
  const store = useStore()  // May throw, Suspense handles it
  return <div>Ready!</div>
}
```

#### Vue: Composables Must Return Promises

Vue composables cannot throw promises for Suspense. They must return promises that the component setup awaits.

```vue
<!-- Vue composable pattern -->
<script setup>
// Composable returns a promise
async function useStore() {
  const store = getStore()
  if (!store.ready) {
    await store.readyPromise  // Await the promise
  }
  return store
}

// Usage - must await
const store = await useStore()  // Makes setup async
</script>
```

### 4. The `use()` Hook vs Composables

#### React: `use()` for Promise Consumption

React 19 introduces `use()` which can consume promises and integrates with Suspense:

```jsx
import { use } from 'react'

function Component({ dataPromise }) {
  const data = use(dataPromise)  // Suspends if promise is pending
  return <div>{data}</div>
}
```

The `use()` hook:
- Can be called conditionally (unlike other hooks)
- Throws the promise if it's pending
- Returns the resolved value when ready
- Integrates seamlessly with Suspense

#### Vue: No Equivalent - Use Async Setup

Vue doesn't have a direct equivalent to React's `use()`. Instead, you use async setup:

```vue
<script setup>
// Receive promise as prop
const props = defineProps<{ dataPromise: Promise<Data> }>()

// Await it directly
const data = await props.dataPromise
</script>

<template>
  <div>{{ data }}</div>
</template>
```

## Practical Implications for LiveStore

### React Implementation (Current)

The React LiveStore implementation uses the throw-promise pattern:

```tsx
// React version - works
export function useStore() {
  const store = useContext(StoreContext)
  if (!store.ready) {
    throw store.readyPromise  // ✓ React Suspense catches this
  }
  return store
}

// Usage
function Component() {
  const store = useStore()  // May suspend
  return <div>Store ready!</div>
}
```

### Vue Implementation (Needs Adaptation)

The same pattern **does not work** in Vue:

```vue
<!-- This DOES NOT WORK in Vue -->
<script setup>
// ✗ useStore throws but isn't async
const { store } = await useStore()  // Throws before await can catch it!
</script>
```

**Why it fails:**
1. `useStore()` is called synchronously
2. It throws the promise immediately
3. The `await` never gets a chance to handle the promise
4. Vue's error handler catches it as an error, not a suspension signal

**Correct Vue pattern:**

```typescript
// Make useStore async
export async function useStore() {
  const store = inject(LiveStoreKey)
  const readyState = inject(StoreReadyStateKey)

  // Await instead of throw
  if (readyState && !readyState.ready.value) {
    await readyState.promise  // ✓ Actually waits
  }

  return { store }
}
```

```vue
<!-- Usage -->
<script setup>
const { store } = await useStore()  // ✓ Works with async useStore
</script>
```

## Code Comparison: Side by Side

### Data Fetching Example

#### React

```jsx
// Store context
const StoreContext = React.createContext()

// Provider throws promise
function StoreProvider({ children }) {
  const store = useCreateStore()

  if (!store.ready) {
    throw store.readyPromise  // React catches
  }

  return (
    <StoreContext.Provider value={store}>
      {children}
    </StoreContext.Provider>
  )
}

// Hook throws promise
function useStore() {
  const store = useContext(StoreContext)
  if (!store) throw new Error('No store')
  return store  // Or throws if not ready
}

// App
function App() {
  return (
    <Suspense fallback={<Loading />}>
      <StoreProvider>
        <Content />
      </StoreProvider>
    </Suspense>
  )
}

function Content() {
  const store = useStore()  // May suspend
  return <div>Ready!</div>
}
```

#### Vue

```vue
<!-- Store Provider -->
<script setup>
import { provide, ref } from 'vue'

const props = defineProps<{ storeId: string }>()

// Create store asynchronously
const ready = ref(false)
const storePromise = createStore(props.storeId)
const store = await storePromise  // Await in provider
ready.value = true

provide('store', store)
</script>

<template>
  <slot />
</template>

<!-- Composable (async) -->
<script>
export async function useStore() {
  const store = inject('store')
  if (!store) throw new Error('No store')

  // If store has readyState, await it
  const readyState = inject('storeReadyState')
  if (readyState && !readyState.ready.value) {
    await readyState.promise
  }

  return store
}
</script>

<!-- App -->
<template>
  <Suspense>
    <template #default>
      <StoreProvider storeId="main">
        <Content />
      </StoreProvider>
    </template>
    <template #fallback>
      <Loading />
    </template>
  </Suspense>
</template>

<!-- Content Component -->
<script setup>
const store = await useStore()  // Await async composable
</script>

<template>
  <div>Ready!</div>
</template>
```

## Common Pitfalls When Porting React → Vue

### ❌ Pitfall 1: Throwing Promises in Sync Functions

```vue
<!-- WRONG -->
<script setup>
function useStore() {
  const store = inject('store')
  if (!store.ready) {
    throw store.readyPromise  // Vue doesn't catch this!
  }
  return store
}

const store = await useStore()  // Won't work!
</script>
```

**Fix:** Make the function async and await:

```vue
<!-- CORRECT -->
<script setup>
async function useStore() {
  const store = inject('store')
  if (!store.ready) {
    await store.readyPromise  // Actually waits
  }
  return store
}

const store = await useStore()  // Works!
</script>
```

### ❌ Pitfall 2: Forgetting Top-Level Await

```vue
<!-- WRONG -->
<script setup>
async function loadData() {
  return await fetchData()
}

const data = loadData()  // Missing await!
</script>

<template>
  <div>{{ data }}</div>  <!-- data is a Promise! -->
</template>
```

**Fix:** Use top-level await:

```vue
<!-- CORRECT -->
<script setup>
async function loadData() {
  return await fetchData()
}

const data = await loadData()  // Top-level await
</script>

<template>
  <div>{{ data }}</div>  <!-- data is the resolved value -->
</template>
```

### ❌ Pitfall 3: Using React's Proxy Pattern

```typescript
// WRONG in Vue
const proxy = new Proxy({}, {
  get(target, prop) {
    if (!ready.value) {
      throw readyPromise  // Doesn't work in Vue!
    }
    return store[prop]
  }
})
```

**Fix:** Make property access async or await the ready state before creating proxy:

```typescript
// CORRECT in Vue
const readyState = inject(StoreReadyStateKey)
if (readyState && !readyState.ready.value) {
  await readyState.promise  // Wait first
}

// Now create proxy (no throwing needed)
const proxy = new Proxy(store, {
  get(target, prop) {
    return target[prop]  // Store is guaranteed ready
  }
})
```

### ❌ Pitfall 4: Nested Suspense Without Suspensible

```vue
<!-- May not work as expected -->
<Suspense>
  <Parent>
    <Suspense>
      <Child />  <!-- Might not trigger parent Suspense -->
    </Suspense>
  </Parent>
</Suspense>
```

**Fix:** Use `suspensible` option (Vue 3.3+):

```vue
<Suspense>
  <Parent>
    <Suspense suspensible>  <!-- Propagates to parent -->
      <Child />
    </Suspense>
  </Parent>
</Suspense>
```

## Best Practices

### React

1. ✓ Use `use()` hook for promise consumption (React 19+)
2. ✓ Throw promises from hooks for Suspense integration
3. ✓ Use Error Boundaries for error handling
4. ✓ Use `startTransition` for non-urgent updates
5. ✓ Nest Suspense boundaries for progressive loading

### Vue

1. ✓ Always use async setup or top-level await
2. ✓ Make composables async if they need to wait on promises
3. ✓ Use `errorCaptured` lifecycle hook for errors
4. ✓ Use `suspensible` prop for nested Suspense (3.3+)
5. ✓ Remember Suspense is experimental - API may change

## Summary Table: Pattern Conversion

| React Pattern | Vue Equivalent |
|---------------|----------------|
| `throw promise` | `await promise` |
| `use(promise)` | `await promise` |
| Sync hook throws | Async composable awaits |
| Error Boundary | `errorCaptured` hook |
| `<Suspense fallback={<Loading />}>` | `<Suspense><template #fallback><Loading /></template></Suspense>` |
| Re-suspend on prop change | Re-mount component |
| `startTransition` | No direct equivalent |

## Conclusion

While React and Vue both provide Suspense for handling async operations, their implementations are fundamentally different:

- **React** uses a throw-and-catch mechanism during rendering
- **Vue** uses async setup functions that return promises

When porting React patterns to Vue:
1. Change thrown promises to awaited promises
2. Make hooks/composables async
3. Use top-level await in `<script setup>`
4. Don't rely on mid-render suspension
5. Test thoroughly as Vue's Suspense is still experimental

## References

- [React Suspense Documentation](https://react.dev/reference/react/Suspense)
- [React `use()` Hook](https://react.dev/reference/react/use)
- [Vue Suspense Documentation](https://vuejs.org/guide/built-ins/suspense.html)
- [Vue Async Components](https://vuejs.org/guide/components/async.html)

## Related Documents

- [React Multi-Store Implementation](./react-multi-store-reference.md) - Reference implementation using React's throw pattern
- [Vue Multi-Store Design](./vue-multi-store.md) - Vue-specific implementation considerations
- [Design Document](./design-doc.md) - Original multi-store API design (React-focused)