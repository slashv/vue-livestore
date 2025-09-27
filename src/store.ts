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
  const readyState = inject(StoreReadyStateKey, null)
  const initErr = inject(StoreInitErrorKey, null)

  if (readyState && !readyState.ready.value) {
    throw readyState.promise
  }

  const injected = inject(LiveStoreKey)
  if (!injected) {
    throw new Error('LiveStore instance not provided. Make sure to install the provider and pass a store.')
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
      const value = (store as any)[prop] // eslint-disable-line @typescript-eslint/no-explicit-any
      if (typeof value === 'function') {
        return (...args: unknown[]) => value.apply(store, args)
      }
      return value
    },
  }) as LiveStoreInstance

  return markRaw(proxy)
}
