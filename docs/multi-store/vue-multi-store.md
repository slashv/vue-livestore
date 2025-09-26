## Vue Multi-Store – Parity Decisions with React

### Goals
- Match React’s behavior and ergonomics where sensible.
- Avoid duplicating store creation logic in multi-store.
- Provide clear isolation between store types and between provider instances.

### Decisions
- Provider delegation: Vue `createStoreContext` delegates store creation to `LiveStoreProvider`. No multi-store-specific store boot logic is duplicated.
- Provider render semantics: Vue `LiveStoreProvider` blocks children until the store is ready and renders a loading slot meanwhile (mirrors React provider’s “renderLoading until running, then children” behavior). Reference: React implementation’s staged rendering (renderLoading/error/shutdown vs children) in LiveStoreProvider.
  - React reference: https://raw.githubusercontent.com/livestorejs/livestore/946a6b57e298f6818c40f33085643cc4ba8d2022/packages/%40livestore/react/src/LiveStoreProvider.tsx
- Per-context key: Each multi-store context uses a unique `StoreKey` (via Vue provide/inject) to avoid cross-store shadowing and to mirror React’s separate contexts per store type.
- Registry isolation: Each `Provider` instance creates its own registry `Map<string, Store>` (no inheritance). This mirrors React’s `Context.Provider` scoping and keeps instances isolated per provider.
- Registrar: A lightweight `StoreRegistrar` component registers the created store in the provider’s registry and re-provides the real store under the per-context `StoreKey` once available.
- Default access: `useStore()` injects the per-context `StoreKey` and never suspends. Calls outside a matching provider throw a clear error.
- Multi-instance access: `useStore({ storeId })` looks up the instance in the current provider’s registry. If missing, it throws a Promise (with timeout) to integrate with Suspense until the specific instance is registered.
- Slot forwarding: Multi-store `Provider` forwards `loading` to `LiveStoreProvider` and wraps children with the registrar in the default slot.
- Devtools: `__debugLiveStore` behavior remains aligned with the core provider; multi-store does not change it.

### Resulting Behavior
- Dependent stores (parent → child) work as in React: child providers are nested under parent providers and resolve after the parent is ready.
- Multiple instances: supported via `storeId` and the per-provider registry.
- Error paths: informative errors for missing provider context or missing instances by `storeId`.

### Open Question – Nested Concurrent Stores
- Today, because `LiveStoreProvider` blocks children until ready (React parity), nested providers serialize. If we want concurrent nested loading:
  - Option A (handled in multi-store): render the subtree immediately under a per-context proxy store that suspends on access, while booting the real store inside `LiveStoreProvider` + `StoreRegistrar`. This enables concurrent loading without changing `LiveStoreProvider` semantics.
  - Option B: keep current behavior and recommend structuring independent providers as siblings to achieve concurrency.
  - Decision pending: whether to implement Option A in Vue multi-store for strict concurrency parity with the React design proposal.


