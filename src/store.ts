import { inject, markRaw, type InjectionKey, type Ref } from 'vue'
import { type Store } from '@livestore/livestore'
import { useQuery } from './query'
import { useClientDocument } from './clientDocument'

export type VueApi = {
  useQuery: typeof useQuery,
  useClientDocument: typeof useClientDocument
}

export type LiveStoreInstance = Store & VueApi

export const LiveStoreKey: InjectionKey<LiveStoreInstance> = Symbol('LiveStore')

export type StoreReadyState = {
  ready: Ref<boolean>,
  promise: Promise<void>,
}
export const StoreReadyStateKey: InjectionKey<StoreReadyState> = Symbol('LiveStoreReadyState')

export type StoreInitError = {
  error: Ref<unknown | null>
}
export const StoreInitErrorKey: InjectionKey<StoreInitError> = Symbol('LiveStoreInitError')

export const withVueApi = (store: Store): LiveStoreInstance => {
  const _store = store as LiveStoreInstance
  _store.useQuery = (queryDef) => useQuery(queryDef, { store })
  _store.useClientDocument = (table, id, options) => useClientDocument(table, id, options, { store })
  return _store
}

export const useStore = (options?: { store: Store }) => {
  if (options?.store) {
    return { store: withVueApi(options.store) }
  }
  const injected = inject(LiveStoreKey)
  if (!injected) {
    throw new Error('LiveStore instance not provided. Make sure to install the provider and pass a store.')
  }

  const readyState = inject(StoreReadyStateKey, null)
  const initErr = inject(StoreInitErrorKey, null)

  if (readyState && !readyState.ready.value) {
    throw readyState.promise
  }

  if (initErr?.error.value) {
    throw initErr.error.value
  }
  return { store: injected }
}

export const createDeferredStoreProxy = (
  getStore: () => LiveStoreInstance | null,
  ready: Ref<boolean>,
  readyPromise: Promise<void>,
  getError: () => unknown | null,
): LiveStoreInstance => {
  const proxy = new Proxy({}, {
    get(_target, prop, _receiver) {
      const throwIfNotReady = () => {
        const err = getError()
        if (err) {
          throw err
        }
        if (!ready.value) {
          throw readyPromise
        }
      }
      // If not ready or errored, suspend or error on any property access
      throwIfNotReady()

      const store = getStore()
      if (!store) {
        throw new Error('Store is not resolved')
      }
      const key = prop as keyof LiveStoreInstance
      const value = store[key]
      if (typeof value === 'function') {
        return (...args: unknown[]) => (value as (...args: unknown[]) => unknown).apply(store, args)
      }
      return value
    },
  }) as LiveStoreInstance

  // Ensure Vue-specific API exists on the proxy itself so callers can use
  // store.useQuery(...) and store.useClientDocument(...) in both sync and suspense flows
  // without depending on the underlying store object having been resolved yet.
  type UseQueryParams = Parameters<typeof useQuery>
  ;(proxy as LiveStoreInstance).useQuery = ((queryDef: UseQueryParams[0], _options?: UseQueryParams[1]) =>
    useQuery(queryDef, {
      // Route calls through the proxy; access to .query/.subscribe will suspend until ready
      store: proxy as unknown as Store,
    })) as typeof useQuery
  type UseClientDocumentParams = Parameters<typeof useClientDocument>
  ;(proxy as LiveStoreInstance).useClientDocument = ((
    table: UseClientDocumentParams[0],
    id?: UseClientDocumentParams[1],
    options?: UseClientDocumentParams[2],
  ) =>
    useClientDocument(
      table,
      id as UseClientDocumentParams[1],
      options as UseClientDocumentParams[2],
      { store: proxy as unknown as Store },
    )) as typeof useClientDocument

  return markRaw(proxy)
}
