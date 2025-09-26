import { inject, type InjectionKey, type Ref } from 'vue'
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

  if (initErr?.error.value) {
    throw initErr.error.value
  }
  if (readyState && !readyState.ready.value) {
    throw readyState.promise
  }
  return { store: injected }
}
